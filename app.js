// Importações essenciais do React
const { useState, useRef, useEffect, useMemo } = React;

// ----- INÍCIO DA ALTERAÇÃO: Lista de checklist padrão -----
// Movemos a lista de itens padrão para fora do componente para ser uma constante global.
const DEFAULT_CHECKLIST_ITEMS = [
  "Temperatura e Umidade",
  "Limpeza Física do Ambiente",
  "Verificação de Cabos e Conexões",
];
// ----- FIM DA ALTERAÇÃO -----

// Função auxiliar para formatar o texto na tabela
const formatTextForDisplay = (text, maxLength) => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  const chunks = [];
  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.substring(i, i + maxLength));
  }
  return chunks.join('\n');
};

// Componente para renderizar a tabela de registros
const RecordsTable = ({
  recordList,
  isDashboard = false,
  editingRecord,
  setEditingRecord,
  handleSaveEdit,
  handleCancelEdit,
  handleStartEdit,
  handleDeleteRecord
}) => (
  <div className="overflow-x-auto">
    <table className="w-full mt-4 border-collapse">
      <thead>
        <tr className="bg-gray-200">
          <th className="border p-2">Data</th>
          <th className="border p-2">Hora</th>
          <th className="border p-2">Nome</th>
          <th className="border p-2">Item</th>
          <th className="border p-2">Status</th>
          <th className="border p-2 max-w-xs">Observações</th>
          {!isDashboard && <th className="border p-2">Ações</th>}
        </tr>
      </thead>
      <tbody>
        {recordList.map((record, mapIndex) => {
          const originalIndex = isDashboard ? record.originalIndex : mapIndex;
          const isEditing = editingRecord.index === originalIndex;

          return (
            <tr key={originalIndex} className="hover:bg-gray-50">
              <td className="border px-2 py-1 align-top">{record.Data}</td>
              <td className="border px-2 py-1 align-top">{record.Hora}</td>
              <td className="border px-2 py-1 align-top">{record.Nome}</td>
              <td className="border px-2 py-1 align-top">{record['Item Verificado']}</td>
              <td className="border px-2 py-1 align-top">{record.Status}</td>
              <td className="border px-2 py-1 max-w-xs align-top">
                {isEditing ? (
                  <textarea
                    value={editingRecord.text}
                    onChange={(e) => setEditingRecord({ ...editingRecord, text: e.target.value })}
                    className="w-full p-1 border rounded"
                    rows="4"
                    autoFocus
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words leading-snug m-0">
                    {formatTextForDisplay(record.Observações, 22)}
                  </p>
                )}
              </td>
              {!isDashboard && (
                <td className="border px-2 py-1 align-top">
                  <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                    {isEditing ? (
                      <>
                        <button onClick={handleSaveEdit} className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">Salvar</button>
                        <button onClick={handleCancelEdit} className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleStartEdit(originalIndex, record.Observações)} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">Editar</button>
                        <button onClick={() => handleDeleteRecord(originalIndex)} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">Excluir</button>
                      </>
                    )}
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// Componente principal da aplicação
function App() {
  const [technician, setTechnician] = useState('');
  const [currentItemIndex, setCurrentItemIndex] = useState(-1);
  const [status, setStatus] = useState('');
  const [observations, setObservations] = useState('');
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [excelData, setExcelData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileHandle, setFileHandle] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [currentSheetName, setCurrentSheetName] = useState('');

  const [showDashboard, setShowDashboard] = useState(false);
  const [filterData, setFilterData] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [chartType, setChartType] = useState('bar');
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const [editingRecord, setEditingRecord] = useState({ index: null, text: '' });
  
  // ----- INÍCIO DA ALTERAÇÃO: checklistItems agora é um estado -----
  const [checklistItems, setChecklistItems] = useState(DEFAULT_CHECKLIST_ITEMS);
  // ----- FIM DA ALTERAÇÃO -----

  // ----- INÍCIO DA ALTERAÇÃO: useEffect para carregar dados E o checklist da planilha -----
  useEffect(() => {
    if (excelData && currentSheetName) {
      try {
        const { workbook } = excelData;
        const worksheet = workbook.Sheets[currentSheetName];
        if (!worksheet) {
          setError(`Planilha "${currentSheetName}" não encontrada.`);
          setRecords([]);
          setChecklistItems(DEFAULT_CHECKLIST_ITEMS); // Reseta para o padrão se a planilha não for encontrada
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = jsonData[0] || [];
        
        // Carrega os registros
        const loadedRecords = jsonData.slice(1).map(row => ({
          Data: row[0] || '', Hora: row[1] || '', Nome: row[2] || '', 'Item Verificado': row[3] || '', Status: row[4] || '', Observações: row[5] || ''
        })).filter(r => r.Data || r.Hora || r.Nome || r['Item Verificado'] || r.Status || r.Observações);
        
        // Procura pela coluna 'ChecklistItems' para carregar a lista dinâmica
        const checklistColumnIndex = headers.findIndex(h => String(h).toLowerCase() === 'checklistitems');

        if (checklistColumnIndex !== -1) {
          // Extrai itens únicos e não vazios da coluna
          const newChecklistItems = [...new Set(
            jsonData.slice(1)
              .map(row => row[checklistColumnIndex])
              .filter(item => item && String(item).trim() !== '')
          )];
          
          if (newChecklistItems.length > 0) {
            setChecklistItems(newChecklistItems);
            setSuccessMessage(`Exibindo ${loadedRecords.length} registros e checklist personalizado da planilha "${currentSheetName}".`);
          } else {
            setChecklistItems(DEFAULT_CHECKLIST_ITEMS);
            setSuccessMessage(`Exibindo ${loadedRecords.length} registros. Checklist personalizado não encontrado, usando padrão.`);
          }
        } else {
          // Se a coluna não existir, usa a lista padrão
          setChecklistItems(DEFAULT_CHECKLIST_ITEMS);
          setSuccessMessage(`Exibindo ${loadedRecords.length} registros da planilha "${currentSheetName}".`);
        }
        
        setRecords(loadedRecords);
        setError('');
      } catch (err) {
        setError('Erro ao carregar dados da planilha: ' + err.message);
        setSuccessMessage('');
        setRecords([]);
        setChecklistItems(DEFAULT_CHECKLIST_ITEMS);
      }
    }
  }, [currentSheetName, excelData]);
  // ----- FIM DA ALTERAÇÃO -----

  const handleDeleteRecord = (indexToDelete) => {
    if (window.confirm('Tem certeza de que deseja excluir este registro?')) {
      const updatedRecords = records.filter((_, index) => index !== indexToDelete);
      setRecords(updatedRecords);
    }
  };

  const handleStartEdit = (indexToEdit, currentText) => {
    setEditingRecord({ index: indexToEdit, text: currentText });
  };

  const handleCancelEdit = () => {
    setEditingRecord({ index: null, text: '' });
  };

  const handleSaveEdit = () => {
    if (editingRecord.index === null) return;
    const updatedRecords = records.map((record, index) => {
      if (index === editingRecord.index) {
        return { ...record, Observações: editingRecord.text || 'Nenhuma' };
      }
      return record;
    });
    setRecords(updatedRecords);
    handleCancelEdit();
  };

  const handleOpenFile = async () => {
    if (!window.showOpenFilePicker) {
      setError('Seu navegador não suporta a edição direta de arquivos. Tente usar o Chrome ou Edge.');
      return;
    }

    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Planilhas',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.oasis.opendocument.spreadsheet': ['.ods']
          }
        }],
        multiple: false
      });
      
      const file = await handle.getFile();
      setFileHandle(handle);
      setFileName(file.name);
      setFileType(file.name.split('.').pop());

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          const allSheetNames = workbook.SheetNames;
          setSheetNames(allSheetNames);

          const initialSheet = allSheetNames.includes('Checklist Datacenter') ? 'Checklist Datacenter' : allSheetNames[0] || 'Sheet1';
          setCurrentSheetName(initialSheet);
          
          setExcelData({ workbook });
          setError('');

        } catch (err) {
          setError('Erro ao ler o arquivo: ' + err.message);
          setSuccessMessage('');
          setFileHandle(null);
        }
      };
      reader.readAsArrayBuffer(file);

    } catch (err) {
      console.log('Seleção de arquivo cancelada ou falhou.', err);
    }
  };

  const startChecklist = () => {
    if (!fileHandle) {
      setError('Por favor, abra um arquivo antes de iniciar.');
      setSuccessMessage('');
      return;
    }
    if (!technician.trim()) {
      setError('Por favor, preencha o nome.');
      setSuccessMessage('');
      return;
    }
    setError('');
    setSuccessMessage('');
    setCurrentItemIndex(0);
    setShowDashboard(false);
  };

  const handleSubmit = () => {
    if (!['OK', 'ALERTA', 'FALHA'].includes(status.toUpperCase())) {
      setError('Status deve ser OK, Alerta ou Falha.');
      setSuccessMessage('');
      return;
    }
    const now = new Date();
    const newRecord = {
      Data: now.toLocaleDateString('pt-BR'),
      Hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      Nome: technician,
      'Item Verificado': checklistItems[currentItemIndex],
      Status: status.toUpperCase(),
      Observações: observations || 'Nenhuma'
    };
    setRecords([...records, newRecord]);
    setStatus('');
    setObservations('');
    setError('');
    
    if (currentItemIndex + 1 < checklistItems.length) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      setCurrentItemIndex(-1);
      setTechnician('');
      setSuccessMessage('Checklist finalizado com sucesso!');
    }
  };

  // ----- INÍCIO DA ALTERAÇÃO: Funções de salvar agora incluem a coluna 'ChecklistItems' -----
  const saveToFile = async () => {
    if (!fileHandle || !excelData) {
      setError('Nenhuma referência de arquivo ou dados carregados para salvar.');
      return;
    }
    if (!currentSheetName) {
      setError('Nenhuma planilha selecionada para salvar.');
      return;
    }

    try {
      const { workbook } = excelData;
      // Adiciona a coluna ChecklistItems ao cabeçalho e aos dados
      const headers = ['Data', 'Hora', 'Nome', 'Item Verificado', 'Status', 'Observações', 'ChecklistItems'];
      const worksheetData = [
        headers, 
        ...records.map((r, index) => [
          r.Data, 
          r.Hora, 
          r.Nome, 
          r['Item Verificado'], 
          r.Status, 
          r.Observações,
          checklistItems[index] || '' // Adiciona o item do checklist correspondente à linha
        ])
      ];
      
      const newWorksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      newWorksheet['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 40 }, { wch: 30 } // Largura para a nova coluna
      ];

      workbook.Sheets[currentSheetName] = newWorksheet;
      const wbout = XLSX.write(workbook, { bookType: fileType, type: 'array' });
      const writable = await fileHandle.createWritable();
      await writable.write(wbout);
      await writable.close();
      setSuccessMessage(`Arquivo "${fileName}" atualizado e salvo com sucesso!`);
      setError('');
    } catch (err) {
      if (err.name === 'InvalidStateError' || err.message.includes('state had changed')) {
        setError('CONFLITO: O arquivo foi modificado por outro programa. Use "Salvar Como" para não perder suas alterações.');
        setSuccessMessage('');
      } else {
        setError('Erro ao salvar o arquivo diretamente: ' + err.message);
        setSuccessMessage('');
      }
    }
  };

  const handleSaveAs = async () => {
      if (records.length === 0 && checklistItems.length === 0) {
        setError('Nenhum dado para salvar.');
        return;
      }
      try {
        const newFileHandle = await window.showSaveFilePicker({
            suggestedName: fileName || 'checklist.xlsx',
            types: [{
                description: 'Planilhas',
                accept: {
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                    'application/vnd.oasis.opendocument.spreadsheet': ['.ods']
                }
            }],
        });
        
        // Se não houver workbook existente, cria um novo
        const workbook = excelData ? excelData.workbook : XLSX.utils.book_new();
        const sheetName = currentSheetName || 'Checklist Datacenter';

        // Adiciona a coluna ChecklistItems ao cabeçalho e aos dados
        const headers = ['Data', 'Hora', 'Nome', 'Item Verificado', 'Status', 'Observações', 'ChecklistItems'];
        const dataToSave = records.length > 0 ? records : checklistItems.map(() => ({})); // Garante que a coluna de checklist seja salva mesmo sem registros
        
        const worksheetData = [
          headers, 
          ...dataToSave.map((r, index) => [
            r.Data || '', 
            r.Hora || '', 
            r.Nome || '', 
            r['Item Verificado'] || '', 
            r.Status || '', 
            r.Observações || '',
            checklistItems[index] || '' // Adiciona o item do checklist correspondente à linha
          ])
        ];

        const newWorksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        newWorksheet['!cols'] = [
          { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 40 }, { wch: 30 } // Largura para a nova coluna
        ];
        
        // Remove a planilha antiga se existir e adiciona a nova
        if (workbook.SheetNames.includes(sheetName)) {
            delete workbook.Sheets[sheetName];
        }
        XLSX.utils.book_append_sheet(workbook, newWorksheet, sheetName);
        
        const newFileType = newFileHandle.name.split('.').pop();
        const wbout = XLSX.write(workbook, { bookType: newFileType, type: 'array' });

        const writable = await newFileHandle.createWritable();
        await writable.write(wbout);
        await writable.close();
        
        setFileHandle(newFileHandle);
        setFileName(newFileHandle.name);
        setFileType(newFileType);
        // Atualiza os dados internos para refletir o novo estado salvo
        setExcelData({ workbook });
        setSheetNames(workbook.SheetNames);
        setCurrentSheetName(sheetName);

        setError('');
        setSuccessMessage(`Alterações salvas com sucesso no novo arquivo "${newFileHandle.name}"!`);

      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Erro ao tentar salvar o novo arquivo: ' + err.message);
          setSuccessMessage('');
        }
      }
  };
  // ----- FIM DA ALTERAÇÃO -----

  const prepareChartData = (filteredRecs, type) => {
    if (type === 'pie') {
      const statusCounts = { OK: 0, ALERTA: 0, FALHA: 0 };
      filteredRecs.forEach(record => {
        statusCounts[record.Status] = (statusCounts[record.Status] || 0) + 1;
      });
      return {
        labels: ['OK', 'ALERTA', 'FALHA'],
        datasets: [{
          label: 'Total de Status',
          data: [statusCounts.OK, statusCounts.ALERTA, statusCounts.FALHA],
          backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(255, 99, 132, 0.6)'],
          borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)'],
          borderWidth: 1,
        }],
      };
    }
    
    if (type === 'line') {
      const parseDate = (dateString) => {
        const [day, month, year] = dateString.split('/');
        return new Date(year, month - 1, day);
      };
      const dataByDate = filteredRecs.reduce((acc, record) => {
        const date = record.Data;
        if (!date) return acc;
        if (!acc[date]) {
          acc[date] = { OK: 0, ALERTA: 0, FALHA: 0 };
        }
        if (acc[date][record.Status] !== undefined) {
           acc[date][record.Status]++;
        }
        return acc;
      }, {});
      const sortedDates = Object.keys(dataByDate).sort((a, b) => parseDate(a) - parseDate(b));
      return {
        labels: sortedDates,
        datasets: [
          { label: 'OK', data: sortedDates.map(date => dataByDate[date].OK), borderColor: 'rgba(75, 192, 192, 1)', backgroundColor: 'rgba(75, 192, 192, 0.2)', fill: true, tension: 0.3 },
          { label: 'ALERTA', data: sortedDates.map(date => dataByDate[date].ALERTA), borderColor: 'rgba(255, 206, 86, 1)', backgroundColor: 'rgba(255, 206, 86, 0.2)', fill: true, tension: 0.3 },
          { label: 'FALHA', data: sortedDates.map(date => dataByDate[date].FALHA), borderColor: 'rgba(255, 99, 132, 1)', backgroundColor: 'rgba(255, 99, 132, 0.2)', fill: true, tension: 0.3 },
        ],
      };
    }

    // Gráfico de Barras (Padrão): Usa o estado dinâmico `checklistItems`
    const statusCounts = checklistItems.map(item => {
      const counts = { OK: 0, ALERTA: 0, FALHA: 0 };
      filteredRecs.filter(r => r['Item Verificado'] === item).forEach(r => { counts[r.Status] = (counts[r.Status] || 0) + 1; });
      return { item, counts };
    });
    return {
      labels: checklistItems,
      datasets: [
        { label: 'OK', data: statusCounts.map(sc => sc.counts.OK), backgroundColor: 'rgba(75, 192, 192, 0.6)' },
        { label: 'ALERTA', data: statusCounts.map(sc => sc.counts.ALERTA), backgroundColor: 'rgba(255, 206, 86, 0.6)' },
        { label: 'FALHA', data: statusCounts.map(sc => sc.counts.FALHA), backgroundColor: 'rgba(255, 99, 132, 0.6)' },
      ],
    };
  };

  const filteredRecords = useMemo(() => {
    return records
      .map((record, index) => ({ ...record, originalIndex: index }))
      .filter(record =>
        (!filterData || record.Data.includes(filterData)) &&
        (!filterTechnician || record.Nome.toLowerCase().includes(filterTechnician.toLowerCase())) &&
        (!filterStatus || record.Status === filterStatus)
      );
  }, [records, filterData, filterTechnician, filterStatus]);

  useEffect(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    if (showDashboard && filteredRecords.length > 0 && chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      const data = prepareChartData(filteredRecords, chartType);
      
      let options = {};
      
      if (chartType === 'pie') {
        options = {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' }, title: { display: true, text: 'Distribuição Geral de Status' } },
        };
      } else if (chartType === 'line') {
          options = {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' }, title: { display: true, text: 'Evolução de Status por Dia' } },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Contagem de Registros' } },
            x: { title: { display: true, text: 'Data' } }
          }
        };
      } else { // bar
        options = {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' }, title: { display: true, text: 'Distribuição de Status por Item Verificado' } },
          scales: {
            y: { beginAtZero: true, stacked: true, title: { display: true, text: 'Contagem' } },
            x: { stacked: true, title: { display: true, text: 'Itens Verificados' } }
          }
        };
      }
      chartInstanceRef.current = new Chart(ctx, { type: chartType, data, options });
    }
  }, [showDashboard, filteredRecords, chartType, checklistItems]); // Adicionado checklistItems à dependência

  return (
    <>
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg my-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Infra<span className="text-indigo-600">Check</span>
        </h1>

        {showDashboard ? (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
               <h2 className="text-lg font-semibold">Dashboard de Registros</h2>
               <button onClick={() => setShowDashboard(false)} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700">Voltar</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700">Filtrar por Data</label>
                 <input type="text" value={filterData} onChange={(e) => setFilterData(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder={"Ex: " + new Date().toLocaleDateString('pt-BR')} />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700">Filtrar por Nome</label>
                 <input type="text" value={filterTechnician} onChange={(e) => setFilterTechnician(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Nome" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700">Filtrar por Status</label>
                 <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                   <option value="">Todos</option><option value="OK">OK</option><option value="ALERTA">Alerta</option><option value="FALHA">Falha</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700">Tipo de Gráfico</label>
                 <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                   <option value="bar">Barra</option><option value="line">Linha</option><option value="pie">Pizza</option>
                 </select>
               </div>
             </div>
             <div className="bg-white p-4 rounded-lg shadow" style={{ height: '400px' }}><canvas ref={chartRef} /></div>
             <div>
               <h3 className="text-md font-medium mb-4">Registros Detalhados</h3>
               {filteredRecords.length === 0 ? (
                 <p className="text-gray-600">Nenhum registro corresponde aos filtros.</p>
               ) : (
                 <RecordsTable
                   recordList={filteredRecords}
                   isDashboard={true}
                   editingRecord={editingRecord}
                   setEditingRecord={setEditingRecord}
                   handleSaveEdit={handleSaveEdit}
                   handleCancelEdit={handleCancelEdit}
                   handleStartEdit={handleStartEdit}
                   handleDeleteRecord={handleDeleteRecord}
                 />
               )}
             </div>
           </div>
        ) : currentItemIndex === -1 ? (
          <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="hidden md:block" aria-hidden="true">
                      <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" style={{stopColor: '#4f46e5', stopOpacity:1}} />
                                  <stop offset="100%" style={{stopColor: '#818cf8', stopOpacity:1}} />
                              </linearGradient>
                          </defs>
                          <rect x="40" y="20" width="120" height="160" rx="8" fill="url(#grad1)" fillOpacity="0.1" />
                          <path d="M 60,40 L 140,40" stroke="#a5b4fc" strokeWidth="4" strokeLinecap="round" />
                          <path d="M 60,50 L 140,50" stroke="#a5b4fc" strokeWidth="4" strokeLinecap="round" />
                          <rect x="70" y="70" width="60" height="10" rx="2" fill="#6366f1" />
                          <rect x="70" y="90" width="60" height="10" rx="2" fill="#6366f1" />
                          <rect x="70" y="110" width="60" height="10" rx="2" fill="#6366f1" />
                          <circle cx="80" cy="140" r="5" fill="#4ade80" />
                          <circle cx="100" cy="140" r="5" fill="#4ade80" />
                          <circle cx="120" cy="140" r="5" fill="#facc15" />
                          <path d="M 20,80 Q 40,100 20,120" stroke="#818cf8" strokeWidth="2" fill="none" />
                          <path d="M 180,90 Q 160,110 180,130" stroke="#818cf8" strokeWidth="2" fill="none" />
                      </svg>
                  </div>
                  <div className="space-y-6">
                      <div>
                          <h2 className="text-xl font-semibold text-gray-700">Bem-vindo!</h2>
                          <p className="text-gray-500">Pronto para iniciar a verificação de hoje?</p>
                      </div>
                      
                      <div className="space-y-4">
                          <button 
                           onClick={handleOpenFile} 
                           className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                          >
                           Abrir Planilha (.xlsx | .ods)
                          </button>
                          {fileName && <p className="mt-2 text-sm text-gray-600 text-center">Arquivo: <strong>{fileName}</strong></p>}
                      </div>

                      {sheetNames.length > 0 && (
                          <div>
                              <label htmlFor="sheet-selector" className="block text-sm font-medium text-gray-700">Selecione a Planilha</label>
                              <select id="sheet-selector" value={currentSheetName} onChange={(e) => setCurrentSheetName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                  {sheetNames.map(name => (<option key={name} value={name}>{name}</option>))}
                              </select>
                          </div>
                      )}

                      <div>
                          <label className="block text-sm font-medium text-gray-700">Insira seu nome</label>
                          <input type="text" value={technician} onChange={(e) => setTechnician(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Seu nome aqui" />
                      </div>

                      <div className="flex flex-col space-y-2">
                          <button onClick={startChecklist} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300" disabled={!fileHandle || !technician}>Iniciar Checklist</button>
                          {records.length > 0 && (
                              <button onClick={() => setShowDashboard(true)} className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 mt-2">Visualizar Dashboard</button>
                          )}
                      </div>
                  </div>
              </div>

              {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
              {successMessage && <p className="text-green-500 mt-4 text-center">{successMessage}</p>}

              {records.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <h2 className="text-xl font-semibold mb-4">Registros Carregados</h2>
                  <RecordsTable
                    recordList={records}
                    isDashboard={false}
                    editingRecord={editingRecord}
                    setEditingRecord={setEditingRecord}
                    handleSaveEdit={handleSaveEdit}
                    handleCancelEdit={handleCancelEdit}
                    handleStartEdit={handleStartEdit}
                    handleDeleteRecord={handleDeleteRecord}
                  />
                  <div className="mt-4 flex flex-col md:flex-row gap-2">
                      <button onClick={saveToFile} className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700">
                          Salvar Alterações
                      </button>
                      <button onClick={handleSaveAs} className="flex-1 bg-teal-600 text-white py-2 rounded-md hover:bg-teal-700">
                          Salvar Como...
                      </button>
                  </div>
                </div>
              )}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Item: {checklistItems[currentItemIndex]}</h2>
            {checklistItems[currentItemIndex] === "Temperatura e Umidade" && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
                <p className="text-sm text-gray-800">
                  <strong>Temperatura:</strong><br />• Faixa ideal: 18°C a 25°C<br />
                  <strong>Umidade:</strong><br />• Faixa ideal: 45% a 55%
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                <option value="">Selecione</option><option value="OK">OK</option><option value="ALERTA">Alerta</option><option value="FALHA">Falha</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Observações</label>
              <textarea value={observations} onChange={(e) => setObservations(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Digite observações (opcional)" rows="4" />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <button onClick={handleSubmit} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
              {currentItemIndex + 1 === checklistItems.length ? 'Finalizar Checklist' : 'Próximo Item'}
            </button>
          </div>
        )}
      </div>

    <footer className="text-center py-6 mt-4 border-t border-gray-200">
        <img 
            src="/img/Rodapé.png"
            alt="Logo da Empresa no Rodapé" 
            className="mx-auto h-10 mb-2" 
        />
        <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} InfraCheck. Todos os direitos reservados.
        </p>
    </footer>
  </>
  );
}

// Renderiza a aplicação no elemento 'root' do seu HTML
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);