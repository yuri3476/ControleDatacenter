const { useState, useRef, useEffect, useMemo } = React;

const DEFAULT_CHECKLIST_ITEMS = [
  "Temperatura e Umidade",
  "Limpeza Física do Ambiente",
  "Verificação de Cabos e Conexões",
];

const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {
  const pageCount = Math.ceil(totalItems / itemsPerPage);

  if (pageCount <= 1) {
    return null;
  }

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pageCount) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-4">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>
      <span className="text-sm text-gray-700">
        Página {currentPage} de {pageCount}
      </span>
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === pageCount}
        className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Próximo
      </button>
    </div>
  );
};


const RecordsTable = ({
  recordList,
  isDashboard = false,
  editingRecord,
  setEditingRecord,
  handleSaveEdit,
  handleCancelEdit,
  handleStartEdit,
  handleStartCorrection,
  handleOpenObservationModal,
  startIndex = 0,
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
          <th className="border p-2">Ações</th>
        </tr>
      </thead>
      <tbody>
        {recordList.map((record, mapIndex) => {
          const originalIndex = isDashboard ? record.originalIndex : startIndex + mapIndex;
          const isEditing = editingRecord.index === originalIndex;

          return (
            <tr key={isDashboard ? originalIndex : mapIndex} className="hover:bg-gray-50">
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
                  <div
                    className="max-h-24 overflow-y-auto p-1 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                    onClick={() => handleOpenObservationModal(record.Observações)}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {record.Observações || 'Nenhuma'}
                    </p>
                  </div>
                )}
              </td>
              <td className="border px-2 py-1 align-top">
                <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                  {isEditing ? (
                    <>
                      <button onClick={handleSaveEdit} className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">Salvar</button>
                      <button onClick={handleCancelEdit} className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600">Cancelar</button>
                    </>
                  ) : (
                    <>
                      {!isDashboard && (
                        <button onClick={() => handleStartEdit(originalIndex, record.Observações)} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">Editar</button>
                      )}
                      {(record.Status === 'ALERTA' || record.Status === 'FALHA') && (
                        <button
                          onClick={() => handleStartCorrection(originalIndex)}
                          className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          Corrigir
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
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
  const [checklistItems, setChecklistItems] = useState(DEFAULT_CHECKLIST_ITEMS);
  const [isNameStep, setIsNameStep] = useState(false);

  const [isAddSheetModalOpen, setIsAddSheetModalOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [newSheetQuestions, setNewSheetQuestions] = useState(['']);

  const [mainCurrentPage, setMainCurrentPage] = useState(1);
  const [dashboardCurrentPage, setDashboardCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [observationModal, setObservationModal] = useState({ isOpen: false, text: '' });

  const handleOpenObservationModal = (text) => {
    setObservationModal({ isOpen: true, text: text || 'Nenhuma observação.' });
  };

  const handleCloseObservationModal = () => {
    setObservationModal({ isOpen: false, text: '' });
  };

  const [correctionModal, setCorrectionModal] = useState({ isOpen: false, recordIndex: null, correctionNotes: '' });

  const handleStartCorrection = (recordIndex) => {
    setCorrectionModal({ isOpen: true, recordIndex: recordIndex, correctionNotes: '' });
  };

  const handleCloseCorrectionModal = () => {
    setCorrectionModal({ isOpen: false, recordIndex: null, correctionNotes: '' });
    setError('');
  };

  const handleSaveCorrection = () => {
    const { recordIndex, correctionNotes } = correctionModal;
    if (recordIndex === null || !correctionNotes.trim()) {
      setError("Por favor, descreva a ação de correção realizada.");
      return;
    }

    const updatedRecords = records.map((record, index) => {
        if(index === recordIndex) {
            const now = new Date();
            const timestamp = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
            const newObservation = `--- CORREÇÃO REALIZADA EM ${timestamp} ---\n${correctionNotes}\n---------------------------------------\n\nObservação Original:\n${record.Observações}`;
            return {
                ...record,
                Status: 'OK',
                Observações: newObservation
            };
        }
        return record;
    });

    setRecords(updatedRecords);
    handleCloseCorrectionModal();
    setSuccessMessage('Registro corrigido e status atualizado para OK!');
  };

  useEffect(() => {
    if (excelData && currentSheetName) {
      try {
        const { workbook } = excelData;
        const worksheet = workbook.Sheets[currentSheetName];
        if (!worksheet) {
          setError(`Planilha "${currentSheetName}" não encontrada.`);
          setRecords([]);
          setChecklistItems(DEFAULT_CHECKLIST_ITEMS);
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = jsonData[0] || [];

        const loadedRecords = jsonData.slice(1).map(row => ({
          Data: row[0] || '', Hora: row[1] || '', Nome: row[2] || '', 'Item Verificado': row[3] || '', Status: row[4] || '', Observações: row[5] || ''
        })).filter(r => r.Data || r.Hora || r.Nome || r['Item Verificado'] || r.Status || r.Observações);

        const checklistColumnIndex = headers.findIndex(h => String(h).toLowerCase() === 'checklistitems');

        if (checklistColumnIndex !== -1) {
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
          setChecklistItems(DEFAULT_CHECKLIST_ITEMS);
          setSuccessMessage(`Exibindo ${loadedRecords.length} registros da planilha "${currentSheetName}".`);
        }

        setRecords(loadedRecords);
        setMainCurrentPage(1);
        setError('');
      } catch (err) {
        setError('Erro ao carregar dados da planilha: ' + err.message);
        setSuccessMessage('');
        setRecords([]);
        setChecklistItems(DEFAULT_CHECKLIST_ITEMS);
      }
    }
  }, [currentSheetName, excelData]);

  const filteredRecords = useMemo(() => {
    const formatFilterDate = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const formattedDateToFilter = formatFilterDate(filterData);

    return records
      .map((record, index) => ({ ...record, originalIndex: index }))
      .filter(record =>
        (!formattedDateToFilter || record.Data === formattedDateToFilter) &&
        (!filterTechnician || record.Nome.toLowerCase().includes(filterTechnician.toLowerCase())) &&
        (!filterStatus || record.Status === filterStatus)
      );
  }, [records, filterData, filterTechnician, filterStatus]);

  useEffect(() => {
    setDashboardCurrentPage(1);
  }, [filterData, filterTechnician, filterStatus]);

  const handleOpenAddSheetModal = () => {
    setNewSheetName('');
    setNewSheetQuestions(['']);
    setError('');
    setIsAddSheetModalOpen(true);
  };

  const handleQuestionChange = (index, value) => {
    const updatedQuestions = [...newSheetQuestions];
    updatedQuestions[index] = value;
    setNewSheetQuestions(updatedQuestions);
  };

  const handleAddQuestion = () => {
    setNewSheetQuestions([...newSheetQuestions, '']);
  };

  const handleRemoveQuestion = (index) => {
    if (newSheetQuestions.length > 1) {
      setNewSheetQuestions(newSheetQuestions.filter((_, i) => i !== index));
    }
  };

  const handleCreateNewSheet = () => {
    const trimmedSheetName = newSheetName.trim();
    if (!trimmedSheetName) {
      setError("O nome da planilha não pode estar em branco.");
      return;
    }
    if (sheetNames.some(name => name.toLowerCase() === trimmedSheetName.toLowerCase())) {
      setError(`A planilha "${trimmedSheetName}" já existe.`);
      return;
    }
    const validQuestions = newSheetQuestions.map(q => q.trim()).filter(q => q !== '');
    if (validQuestions.length === 0) {
      setError("Adicione pelo menos uma pergunta de checklist.");
      return;
    }

    try {
      const { workbook } = excelData;
      const headers = ['Data', 'Hora', 'Nome', 'Item Verificado', 'Status', 'Observações', 'ChecklistItems'];
      const worksheetData = [headers];

      validQuestions.forEach(question => {
        const row = Array(headers.length).fill('');
        row[headers.length - 1] = question;
        worksheetData.push(row);
      });

      const newWorksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      newWorksheet['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 40 }, { wch: 30 }
      ];

      XLSX.utils.book_append_sheet(workbook, newWorksheet, trimmedSheetName);

      const newSheetNames = workbook.SheetNames;
      setExcelData({ workbook });
      setSheetNames(newSheetNames);
      setCurrentSheetName(trimmedSheetName);
      setSuccessMessage(`Planilha "${trimmedSheetName}" criada com sucesso!`);
      setIsAddSheetModalOpen(false);
      setError('');
    } catch (err) {
      setError("Falha ao criar a nova planilha: " + err.message);
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
          setIsNameStep(false);
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
      setIsNameStep(false);
    }
  };

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
      const headers = ['Data', 'Hora', 'Nome', 'Item Verificado', 'Status', 'Observações', 'ChecklistItems'];
      const worksheetData = [
        headers,
        ...records.map((r, index) => [
          r.Data, r.Hora, r.Nome, r['Item Verificado'], r.Status, r.Observações,
          checklistItems[index] || ''
        ])
      ];

      const newWorksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      newWorksheet['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 40 }, { wch: 30 }
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
    if (!excelData) {
      setError('Nenhum dado de planilha carregado para salvar.');
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

      const { workbook } = excelData;
      const newFileType = newFileHandle.name.split('.').pop();
      const wbout = XLSX.write(workbook, { bookType: newFileType, type: 'array' });

      const writable = await newFileHandle.createWritable();
      await writable.write(wbout);
      await writable.close();

      setFileHandle(newFileHandle);
      setFileName(newFileHandle.name);
      setFileType(newFileType);
      setError('');
      setSuccessMessage(`Alterações salvas com sucesso no novo arquivo "${newFileHandle.name}"!`);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Erro ao tentar salvar o novo arquivo: ' + err.message);
        setSuccessMessage('');
      }
    }
  };

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
  }, [showDashboard, filteredRecords, chartType, checklistItems]);

  const indexOfLastMainItem = mainCurrentPage * ITEMS_PER_PAGE;
  const indexOfFirstMainItem = indexOfLastMainItem - ITEMS_PER_PAGE;
  const paginatedRecords = records.slice(indexOfFirstMainItem, indexOfLastMainItem);

  const indexOfLastDashboardItem = dashboardCurrentPage * ITEMS_PER_PAGE;
  const indexOfFirstDashboardItem = indexOfLastDashboardItem - ITEMS_PER_PAGE;
  const paginatedFilteredRecords = filteredRecords.slice(indexOfFirstDashboardItem, indexOfLastDashboardItem);

  return (
    <>
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg my-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Infra<span className="text-indigo-600">Check</span>
        </h1>

        {isAddSheetModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4">
              <h2 className="text-xl font-bold text-gray-800">Criar Nova Planilha</h2>
              <div>
                <label htmlFor="new-sheet-name" className="block text-sm font-medium text-gray-700">Nome da Planilha</label>
                <input
                  id="new-sheet-name"
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Ex: Checklist de Roteadores"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Perguntas do Checklist</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {newSheetQuestions.map((question, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                        className="flex-grow p-2 border border-gray-300 rounded-md"
                        placeholder={`Pergunta ${index + 1}`}
                      />
                      <button
                        onClick={() => handleRemoveQuestion(index)}
                        className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 disabled:bg-red-300"
                        disabled={newSheetQuestions.length <= 1}
                        aria-label="Remover Pergunta"
                      >
                        &#x2715;
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddQuestion}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  + Adicionar outra pergunta
                </button>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <button onClick={() => setIsAddSheetModalOpen(false)} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300">
                  Cancelar
                </button>
                <button onClick={handleCreateNewSheet} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                  Criar Planilha
                </button>
              </div>
            </div>
          </div>
        )}

        {observationModal.isOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center"
            onClick={handleCloseObservationModal}
          >
            <div
              className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">Observação Completa</h2>
              <div className="bg-gray-50 p-4 rounded-md max-h-80 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap">{observationModal.text}</p>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleCloseObservationModal}
                  className="bg-indigo-600 text-white py-2 px-6 rounded-md hover:bg-indigo-700"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {correctionModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-gray-800">Registrar Correção</h2>
              {correctionModal.recordIndex !== null && records[correctionModal.recordIndex] && (
                <p className="text-gray-600">Item: <span className="font-semibold">{records[correctionModal.recordIndex]['Item Verificado']}</span></p>
              )}
              <div>
                <label htmlFor="correction-notes" className="block text-sm font-medium text-gray-700">Notas da Correção</label>
                <textarea
                  id="correction-notes"
                  value={correctionModal.correctionNotes}
                  onChange={(e) => setCorrectionModal({ ...correctionModal, correctionNotes: e.target.value })}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Descreva a ação de correção realizada."
                  rows="4"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <button onClick={handleCloseCorrectionModal} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300">
                  Cancelar
                </button>
                <button onClick={handleSaveCorrection} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                  Salvar e Mudar Status para OK
                </button>
              </div>
            </div>
          </div>
        )}

        {showDashboard ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Dashboard de Registros</h2>
              <button onClick={() => setShowDashboard(false)} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700">Voltar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            
              <div>
                  <label className="block text-sm font-medium text-gray-700">Filtrar por Data</label>
                  <div className="mt-1">
                      <input
                          type="date"
                          value={filterData}
                          onChange={(e) => setFilterData(e.target.value)}
                          className="block w-full p-2 border border-gray-300 rounded-md"
                      />
                      
                      <div className="text-center mt-2">
                          <button
                              onClick={() => setFilterData('')}
                              className={`px-4 py-1 rounded-md text-xs ${filterData ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                              title="Limpar data"
                              disabled={!filterData}
                          >
                              Limpar
                          </button>
                      </div>
                  </div>
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
                <>
                  <RecordsTable
                    recordList={paginatedFilteredRecords}
                    isDashboard={true}
                    editingRecord={editingRecord}
                    setEditingRecord={setEditingRecord}
                    handleSaveEdit={handleSaveEdit}
                    handleCancelEdit={handleCancelEdit}
                    handleStartEdit={handleStartEdit}
                    handleStartCorrection={handleStartCorrection}
                    handleOpenObservationModal={handleOpenObservationModal}
                  />
                  <Pagination
                    totalItems={filteredRecords.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    currentPage={dashboardCurrentPage}
                    onPageChange={setDashboardCurrentPage}
                  />
                </>
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
                      <stop offset="0%" style={{ stopColor: '#4f46e5', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#818cf8', stopOpacity: 1 }} />
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
                  <p className="text-gray-500">Para começar, abra uma planilha de checklist.</p>
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
                    <div className="flex gap-2 items-center">
                      <select id="sheet-selector" value={currentSheetName} onChange={(e) => setCurrentSheetName(e.target.value)} className="flex-grow mt-1 block w-full p-2 border border-gray-300 rounded-md">
                        {sheetNames.map(name => (<option key={name} value={name}>{name}</option>))}
                      </select>
                      <button onClick={handleOpenAddSheetModal} className="mt-1 p-2 bg-green-500 text-white rounded-md hover:bg-green-600" title="Adicionar Nova Planilha">+</button>
                    </div>
                  </div>
                )}

                {fileHandle && (
                  isNameStep ? (
                    <div className="space-y-4 border-t-2 border-indigo-100 pt-6 mt-6">
                      <h2 className="text-lg font-semibold text-gray-800">Identificação do Técnico</h2>
                      <p className="text-sm text-gray-600">Para continuar, por favor, insira seu nome.</p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 sr-only">Insira seu nome</label>
                        <input
                          type="text"
                          value={technician}
                          onChange={(e) => setTechnician(e.target.value)}
                          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Seu nome aqui"
                          autoFocus
                        />
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <button onClick={() => setIsNameStep(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300">
                          Voltar
                        </button>
                        <button onClick={startChecklist} className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300" disabled={!technician.trim()}>
                          Confirmar e Iniciar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-2 pt-4 border-t mt-4">
                      <button onClick={() => setIsNameStep(true)} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                        Iniciar Checklist
                      </button>
                      {records.length > 0 && (
                        <button onClick={() => setShowDashboard(true)} className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700">
                          Visualizar Dashboard
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            {error && !correctionModal.isOpen && <p className="text-red-500 mt-4 text-center">{error}</p>}
            {successMessage && <p className="text-green-500 mt-4 text-center">{successMessage}</p>}

            {records.length > 0 && (
              <div className="mt-8 pt-6 border-t">
                <h2 className="text-xl font-semibold mb-4">Registros Carregados</h2>
                <RecordsTable
                  recordList={paginatedRecords}
                  isDashboard={false}
                  editingRecord={editingRecord}
                  setEditingRecord={setEditingRecord}
                  handleSaveEdit={handleSaveEdit}
                  handleCancelEdit={handleCancelEdit}
                  handleStartEdit={handleStartEdit}
                  handleStartCorrection={handleStartCorrection}
                  handleOpenObservationModal={handleOpenObservationModal}
                  startIndex={indexOfFirstMainItem}
                />
                <Pagination
                  totalItems={records.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  currentPage={mainCurrentPage}
                  onPageChange={setMainCurrentPage}
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);