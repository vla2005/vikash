"""Provisiona apenas views/papel leitor. Requer administrador do PostgreSQL no Docker.
Senha exclusiva via ASSISTANT_READER_PASSWORD; --enable-local pode gerar e salvar no .env ignorado.
Não imprime credenciais, SQL, saída do psql ou dados financeiros.
"""
import argparse
import os
from pathlib import Path
import re
import secrets
import subprocess


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--container",default="vikash-postgres-1")
    parser.add_argument("--database",default="vikash_db")
    parser.add_argument("--enable-local",action="store_true",help="Salva a configuração no backend/.env local, sem alterar o padrão versionado")
    args=parser.parse_args()
    if not re.fullmatch(r"[a-zA-Z0-9_.-]+",args.container) or not re.fullmatch(r"[a-zA-Z0-9_]+",args.database):
        raise SystemExit("Nome inválido de container/banco.")
    root=Path(__file__).resolve().parent.parent
    env_file=root/".env"
    content=env_file.read_text(encoding="utf-8-sig") if args.enable_local and env_file.exists() else ""
    if args.enable_local and not env_file.exists():
        raise SystemExit("Configure o .env local antes do provisionamento.")
    values={}
    for line in content.splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key,value=line.split("=",1);values[key.strip()]=value.strip().strip(chr(34)).strip(chr(39))
    password=os.environ.get("ASSISTANT_READER_PASSWORD") or values.get("ASSISTANT_READER_PASSWORD")
    if not password and args.enable_local: password=secrets.token_urlsafe(36)
    if not password or not re.fullmatch(r"[A-Za-z0-9_-]{30,100}",password):
        raise SystemExit("Forneça uma senha exclusiva de 30–100 caracteres seguros via ambiente; no local, permita gerar com --enable-local.")
    sql="\n".join((root/"migrations"/name).read_text(encoding="utf-8") for name in (
        "2026-10-16-assistant-financial-views.sql","2026-10-16-assistant-reader-permissions.sql","2026-10-16-assistant-query-results.sql","2026-10-16-assistant-answers.sql","2026-10-17-assistant-memory.sql","2026-10-17-assistant-presentation.sql"))
    sql+="\nALTER ROLE vikash_assistant_reader LOGIN PASSWORD '"+password+"';\n"
    command=["docker","exec","-i",args.container,"sh","-c",'exec psql -X -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$1"',"assistant-setup",args.database]
    result=subprocess.run(command,input=sql,text=True,encoding="utf-8",capture_output=True)
    if result.returncode: raise SystemExit("Provisionamento falhou. Verifique o banco/container e os privilégios administrativos; nenhum detalhe sensível foi exibido.")
    if args.enable_local:
        updates={"ASSISTANT_EXECUTION_ENABLED":"true","ASSISTANT_READER_USERNAME":"vikash_assistant_reader",
            "ASSISTANT_READER_PASSWORD":password,"ASSISTANT_READER_JDBC_URL":"jdbc:postgresql://localhost:"+values.get("LOCAL_DB_PORT","5433")+"/"+args.database}
        lines=[]
        for line in content.splitlines():
            key=line.split("=",1)[0].strip() if "=" in line and not line.lstrip().startswith("#") else None
            if key in updates: lines.append(key+"="+updates.pop(key))
            else: lines.append(line)
        lines.extend(key+"="+value for key,value in updates.items())
        env_file.write_text("\n".join(lines)+"\n",encoding="utf-8")
        print("Leitor provisionado e configuração local salva. Reinicie somente a API para ativar.")
    else: print("Leitor provisionado. Configure o mesmo segredo no serviço da API antes de habilitar ASSISTANT_EXECUTION_ENABLED.")

if __name__=="__main__": main()
