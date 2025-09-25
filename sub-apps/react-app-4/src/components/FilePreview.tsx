import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Spin, 
  Alert, 
  Button, 
  Space, 
  Typography, 
  message,
  Table,
  Card,
  Image,
  Progress,
  Input,
  Select,
  Tooltip
} from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
  ReloadOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined
} from '@ant-design/icons';
import { Document, Page, pdfjs } from 'react-pdf';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';
import styles from './FilePreview.module.css';

// 配置 PDF.js worker - 使用 CDN 方案修复 Vite 开发环境路径问题
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const { Title, Text } = Typography;

interface FilePreviewProps {
  file: File | null;
  fileType: 'PDF' | 'Word' | 'Excel' | 'CSV';
  onError?: (error: string) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, fileType, onError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.0);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelColumns, setExcelColumns] = useState<any[]>([]);
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [currentSheet, setCurrentSheet] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  // CSV 相关状态
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvColumns, setCsvColumns] = useState<any[]>([]);
  const [csvOriginalData, setCsvOriginalData] = useState<any[]>([]);
  const [csvSearchText, setCsvSearchText] = useState<string>('');
  const [csvSortColumn, setCsvSortColumn] = useState<string>('');
  const [csvSortOrder, setCsvSortOrder] = useState<'asc' | 'desc'>('asc');
  const previewRef = useRef<HTMLDivElement>(null);
  const wordPreviewRef = useRef<HTMLDivElement>(null);

  // 文件大小限制检查
  const checkFileSize = (file: File): boolean => {
    const maxSizes = {
      PDF: 100 * 1024 * 1024, // 100MB
      Excel: 12 * 1024 * 1024, // 12MB
      Word: 50 * 1024 * 1024,  // 50MB
      CSV: 50 * 1024 * 1024,   // 50MB
    };
    
    if (file.size > maxSizes[fileType]) {
      const maxSizeMB = maxSizes[fileType] / (1024 * 1024);
      setError(`文件大小超过限制 (最大 ${maxSizeMB}MB)`);
      onError?.(`文件大小超过限制 (最大 ${maxSizeMB}MB)`);
      return false;
    }
    return true;
  };

  // PDF 加载完成回调
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setLoadingProgress(100);
  };

  // PDF 加载进度回调 (暂时注释，react-pdf 可能不支持此回调)
  // const onDocumentLoadProgress = ({ loaded, total }: { loaded: number; total: number }) => {
  //   const progress = Math.round((loaded / total) * 100);
  //   setLoadingProgress(progress);
  // };

  // 加载 Word 文档
  const loadWordDocument = useCallback(async (arrayBuffer: ArrayBuffer) => {
    try {
      if (!wordPreviewRef.current) return;
      
      // 清空容器
      wordPreviewRef.current.innerHTML = '';
      
      // 使用 docx-preview 渲染文档
      await renderAsync(arrayBuffer, wordPreviewRef.current, undefined, {
        className: 'docx-preview-container',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: false,
        renderChanges: false,
        renderComments: false,
        renderEndnotes: true,
        renderFootnotes: true,
        renderFooters: true,
        renderHeaders: true,
        useMathMLPolyfill: false,
      });
    } catch (err) {
      throw new Error(`Word文档解析失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }, []);

  // 加载 Excel 文档
  const loadExcelDocument = useCallback(async (arrayBuffer: ArrayBuffer) => {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      
      if (sheetNames.length === 0) {
        throw new Error('Excel文件中没有找到工作表');
      }

      setExcelSheets(sheetNames);
      setCurrentSheet(sheetNames[0]);

      // 加载第一个工作表
      loadExcelSheet(workbook, sheetNames[0]);
    } catch (err) {
      throw new Error(`Excel文件解析失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }, []);

  // 加载指定的 Excel 工作表
  const loadExcelSheet = (workbook: XLSX.WorkBook, sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      setExcelData([]);
      setExcelColumns([]);
      return;
    }

    // 获取表头
    const headers = jsonData[0] as string[];
    const columns = headers.map((header, index) => ({
      title: header || `列${index + 1}`,
      dataIndex: `col_${index}`,
      key: `col_${index}`,
      width: 150,
      ellipsis: true,
    }));

    // 转换数据
    const data = jsonData.slice(1).map((row: any[], rowIndex) => {
      const rowData: any = { key: rowIndex.toString() };
      headers.forEach((_, colIndex) => {
        rowData[`col_${colIndex}`] = row[colIndex] || '';
      });
      return rowData;
    });

    setExcelColumns(columns);
    setExcelData(data);
  };

  // 切换 Excel 工作表
  const handleSheetChange = (sheetName: string) => {
    if (!file) return;
    
    setCurrentSheet(sheetName);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      loadExcelSheet(workbook, sheetName);
    };
        reader.readAsArrayBuffer(file);
  };

  // 加载 CSV 文档
  const loadCsvDocument = useCallback(async (text: string) => {
    try {
      // 使用 xlsx 库解析 CSV (推荐方案，减少依赖)
      const workbook = XLSX.read(text, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        setCsvData([]);
        setCsvColumns([]);
        setCsvOriginalData([]);
        return;
      }

      // 检查行数限制
      if (jsonData.length > 10000) {
        message.warning(`CSV 文件包含 ${jsonData.length} 行数据，建议分批处理以获得更好的性能`);
      }

      // 获取表头
      const headers = jsonData[0] as string[];
      const columns = headers.map((header, index) => ({
        title: header || `列${index + 1}`,
        dataIndex: `col_${index}`,
        key: `col_${index}`,
        width: 150,
        ellipsis: true,
        sorter: true,
        onHeaderCell: () => ({
          onClick: () => handleCsvSort(`col_${index}`),
        }),
      }));

      // 转换数据
      const data = jsonData.slice(1).map((row: any[], rowIndex) => {
        const rowData: any = { key: rowIndex.toString() };
        headers.forEach((_, colIndex) => {
          rowData[`col_${colIndex}`] = row[colIndex] || '';
        });
        return rowData;
      });

      setCsvColumns(columns);
      setCsvData(data);
      setCsvOriginalData(data);
    } catch (err) {
      throw new Error(`CSV文件解析失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }, []);

  // CSV 排序处理
  const handleCsvSort = (columnKey: string) => {
    let newOrder: 'asc' | 'desc' = 'asc';
    if (csvSortColumn === columnKey && csvSortOrder === 'asc') {
      newOrder = 'desc';
    }
    
    setCsvSortColumn(columnKey);
    setCsvSortOrder(newOrder);
    
    const sortedData = [...csvData].sort((a, b) => {
      const aVal = String(a[columnKey] || '');
      const bVal = String(b[columnKey] || '');
      
      // 尝试数字排序
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return newOrder === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // 字符串排序
      return newOrder === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    });
    
    setCsvData(sortedData);
  };

  // CSV 搜索处理
  const handleCsvSearch = (value: string) => {
    setCsvSearchText(value);
    
    if (!value.trim()) {
      setCsvData(csvOriginalData);
      return;
    }
    
    const filteredData = csvOriginalData.filter(row => {
      return Object.values(row).some(cell => 
        String(cell || '').toLowerCase().includes(value.toLowerCase())
      );
    });
    
    setCsvData(filteredData);
  };

  // 切换 Excel 工作表
  // 加载文件
  useEffect(() => {
    if (!file) return;
    
    if (!checkFileSize(file)) return;
    
    setLoading(true);
    setError(null);
    setLoadingProgress(0);
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const result = e.target?.result;
        if (!result) throw new Error('文件读取失败');
        
        switch (fileType) {
          case 'PDF':
            // PDF 由 react-pdf 组件处理，这里不需要额外处理
            break;
          case 'Word':
            await loadWordDocument(result as ArrayBuffer);
            break;
          case 'Excel':
            await loadExcelDocument(result as ArrayBuffer);
            break;
          case 'CSV':
            await loadCsvDocument(result as string);
            break;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '文件加载失败';
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      const errorMsg = '文件读取失败';
      setError(errorMsg);
      onError?.(errorMsg);
      setLoading(false);
    };
    
    if (fileType === 'CSV') {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [file, fileType, loadWordDocument, loadExcelDocument, loadCsvDocument]);

  // 缩放控制
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setScale(1.0);

  // 页面导航
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages));

  // 渲染工具栏
  const renderToolbar = () => (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <Text strong>{file?.name}</Text>
        <Text type="secondary">({fileType})</Text>
        {fileType === 'PDF' && numPages > 0 && (
          <Text type="secondary">({currentPage}/{numPages})</Text>
        )}
      </div>

      <div className={styles.toolbarRight}>
        {fileType === 'PDF' && numPages > 0 && (
          <Space className={styles.zoomControl}>
            <Button 
              icon={<LeftOutlined />} 
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              size="small"
            />
            <span style={{ margin: '0 8px' }}>
              {currentPage} / {numPages}
            </span>
            <Button 
              icon={<RightOutlined />} 
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              size="small"
            />
          </Space>
        )}
        
        {(fileType === 'PDF' || fileType === 'Word') && (
          <Space className={styles.zoomControl}>
            <Button 
              icon={<ZoomOutOutlined />} 
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              size="small"
            />
            <span className={styles.zoomPercent}>
              {Math.round(scale * 100)}%
            </span>
            <Button 
              icon={<ZoomInOutlined />} 
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
              size="small"
            />
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleResetZoom}
              size="small"
            />
          </Space>
        )}

        {fileType === 'CSV' && csvData.length > 0 && (
          <Space className={styles.csvControls}>
            <Input.Search
              placeholder="搜索数据..."
              value={csvSearchText}
              onChange={(e) => handleCsvSearch(e.target.value)}
              style={{ width: 200 }}
              size="small"
            />
            <Tooltip title={`当前排序: ${csvSortColumn ? `${csvSortColumn} (${csvSortOrder === 'asc' ? '升序' : '降序'})` : '无'}`}>
              <Button
                icon={csvSortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                size="small"
                disabled={!csvSortColumn}
              >
                排序
              </Button>
            </Tooltip>
          </Space>
        )}

        {fileType === 'Excel' && excelSheets.length > 1 && (
          <div className={styles.excelSheetTabs}>
            {excelSheets.map(sheetName => (
              <Button
                key={sheetName}
                type={currentSheet === sheetName ? 'primary' : 'default'}
                size="small"
                onClick={() => handleSheetChange(sheetName)}
              >
                {sheetName}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // 渲染内容
  const renderContent = () => {
    if (error) {
      return (
        <div className={styles.errorContainer}>
          <Alert
            message="预览失败"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => window.location.reload()}>
                重试
              </Button>
            }
          />
        </div>
      );
    }

    switch (fileType) {
      case 'PDF':
        return (
          <div className={styles.pdfContainer} style={{ 
            transform: `scale(${scale})`,
            transformOrigin: 'top center'
          }}>
            {loading && (
              <div className={styles.loadingContainer}>
                <Spin size="large" />
                <div className={styles.loadingText}>正在加载PDF文件...</div>
              </div>
            )}
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                setError(`PDF加载失败: ${error.message}`);
                setLoading(false);
              }}
              loading={
                <div className={styles.loadingContainer}>
                  <Spin size="large" />
                  <div className={styles.loadingText}>正在加载PDF文件...</div>
                </div>
              }
            >
              <div className={styles.pdfPage}>
                <Page
                  pageNumber={currentPage}
                />
              </div>
            </Document>
          </div>
        );

      case 'Word':
        return (
          <div style={{ 
            padding: '20px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}>
            <div 
              ref={wordPreviewRef}
              className={styles.docxPreviewContainer}
            />
          </div>
        );

      case 'Excel':
        return (
          <div className={styles.excelContainer}>
            {excelData.length > 0 ? (
              <div className={styles.excelTable}>
                <Table
                  columns={excelColumns}
                  dataSource={excelData}
                  scroll={{ x: 'max-content', y: 600 }}
                  size="small"
                  pagination={{
                    pageSize: 100,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 行数据`,
                  }}
                  bordered
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <FileExcelOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: '20px' }} />
                <div>
                  <Text type="secondary">暂无数据或工作表为空</Text>
                </div>
              </div>
            )}
          </div>
        );

      case 'CSV':
        return (
          <div className={styles.csvContainer}>
            {csvData.length > 0 ? (
              <div className={styles.csvTable}>
                <div className={styles.csvInfo}>
                  <Space>
                    <Text type="secondary">
                      共 {csvOriginalData.length} 行数据
                      {csvSearchText && ` (筛选后: ${csvData.length} 行)`}
                    </Text>
                    {csvOriginalData.length > 10000 && (
                      <Text type="warning">
                        ⚠️ 大文件，建议使用搜索功能
                      </Text>
                    )}
                  </Space>
                </div>
                <Table
                  columns={csvColumns}
                  dataSource={csvData}
                  scroll={{ x: 'max-content', y: 600 }}
                  size="small"
                  pagination={{
                    pageSize: 100,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => 
                      `第 ${range[0]}-${range[1]} 行，共 ${total} 行数据`,
                    pageSizeOptions: ['50', '100', '200', '500'],
                  }}
                  bordered
                  rowClassName={(record, index) => 
                    index % 2 === 0 ? styles.evenRow : styles.oddRow
                  }
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <FileTextOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '20px' }} />
                <div>
                  <Text type="secondary">暂无数据或CSV文件为空</Text>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text type="secondary">不支持的文件类型</Text>
          </div>
        );
    }
  };

  if (!file) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Text type="secondary">请选择要预览的文件</Text>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {renderToolbar()}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Spin spinning={loading && fileType !== 'PDF'} size="large">
          {renderContent()}
        </Spin>
      </div>
    </div>
  );
};

export default FilePreview;