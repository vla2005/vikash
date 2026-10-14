import React, { memo, useState } from 'react';
import CategoryExpensesChart from './CategoryExpensesChart';

// A seleção pertence ao gráfico: não atualizar o restante do dashboard no toque.
export default memo(function DashboardExpensesChart({ visible = true, ...props }) {
  const [scope, setScope] = useState('accounts');
  if (!visible) { return null; }
  return <CategoryExpensesChart {...props} scope={scope} onChangeScope={setScope} />;
});
