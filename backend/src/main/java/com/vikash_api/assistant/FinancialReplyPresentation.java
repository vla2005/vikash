package com.vikash_api.assistant;
import java.util.*;

/** Contrato de dados fechado: nunca contém código, URLs, SQL ou ações executáveis. */
public record FinancialReplyPresentation(String version,List<Block> blocks,String queriedAt,boolean limited) {
    public static final String VERSION="financial-presentation-v1";
    public FinancialReplyPresentation { blocks=List.copyOf(blocks); }
    public record Item(String label,String value,String formattedValue) {}
    public record Block(String type,String title,String caption,String value,String format,List<Item> items) {
        public Block { items=List.copyOf(items); }
    }
    public static Map<String,Object> schema() {
        var text=Map.of("type","string","maxLength",240);
        var metric=Map.of("type","object","properties",Map.of("type",Map.of("type","string","enum",List.of("metric")),"title",text,"caption",text,"value",text),"required",List.of("type","title","caption","value"),"additionalProperties",false);
        var chart=Map.of("type","object","properties",Map.of("type",Map.of("type","string","enum",List.of("pie","bar","list")),"title",text,"caption",text,"labelColumn",text,"valueColumn",text,"format",Map.of("type","string","enum",List.of("money","number"))),"required",List.of("type","title","caption","labelColumn","valueColumn","format"),"additionalProperties",false);
        return Map.of("type","object","properties",Map.of("template",Map.of("type","string","maxLength",4000),"blocks",Map.of("type","array","maxItems",3,"items",Map.of("anyOf",List.of(metric,chart)))),"required",List.of("template","blocks"),"additionalProperties",false);
    }
}
