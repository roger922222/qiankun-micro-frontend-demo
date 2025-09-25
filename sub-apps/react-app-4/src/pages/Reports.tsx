import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  List, 
  Button, 
  Space, 
  Modal, 
  Progress, 
  message, 
  Table, 
  Spin,
  Tag,
  Tooltip,
  Upload,
  Alert
} from 'antd';
import { 
  DownloadOutlined, 
  FileTextOutlined, 
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  EyeOutlined,
  UploadOutlined,
  InboxOutlined
} from '@ant-design/icons';
import FilePreview from '../components/FilePreview';

const { Title, Text } = Typography;

interface Report {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'PDF' | 'Excel' | 'Word' | 'CSV';
  size: string;
  status: 'ready' | 'generating' | 'error';
}

const Reports: React.FC = () => {
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewVisible, setFilePreviewVisible] = useState(false);
  const [currentFileType, setCurrentFileType] = useState<'PDF' | 'Word' | 'Excel' | 'CSV'>('PDF');

  const reports: Report[] = [
    {
      id: '1',
      title: '月度销售报告',
      description: '2024年3月销售数据汇总分析',
      date: '2024-03-31',
      type: 'PDF',
      size: '2.3 MB',
      status: 'ready',
    },
    {
      id: '2',
      title: '用户行为分析',
      description: '用户访问路径和行为模式分析',
      date: '2024-03-30',
      type: 'Excel',
      size: '1.8 MB',
      status: 'ready',
    },
    {
      id: '3',
      title: '产品性能报告',
      description: '各产品线销售表现对比分析',
      date: '2024-03-29',
      type: 'PDF',
      size: '3.1 MB',
      status: 'ready',
    },
    {
      id: '4',
      title: '市场趋势分析',
      description: '行业市场趋势和竞争分析',
      date: '2024-03-28',
      type: 'Word',
      size: '1.2 MB',
      status: 'generating',
    },
    {
      id: '5',
      title: '员工数据统计',
      description: '公司员工基础信息统计表',
      date: '2024-03-27',
      type: 'CSV',
      size: '856 KB',
      status: 'ready',
    },
  ];

  // 获取文件类型图标
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      case 'Excel':
        return <FileExcelOutlined style={{ color: '#52c41a' }} />;
      case 'Word':
        return <FileWordOutlined style={{ color: '#1890ff' }} />;
      case 'CSV':
        return <FileTextOutlined style={{ color: '#722ed1' }} />;
      default:
        return <FileTextOutlined />;
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'ready':
        return <Tag color="success">就绪</Tag>;
      case 'generating':
        return <Tag color="processing">生成中</Tag>;
      case 'error':
        return <Tag color="error">错误</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  // 模拟文件下载
  const handleDownload = async (report: Report) => {
    if (report.status !== 'ready') {
      message.warning('文件还未准备就绪，请稍后再试');
      return;
    }

    try {
      message.info(`开始下载 ${report.title}`);
      
      // 模拟下载进度
      setDownloadProgress(prev => ({ ...prev, [report.id]: 0 }));
      
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setDownloadProgress(prev => ({ ...prev, [report.id]: i }));
      }

      // 创建模拟文件内容
      let content: string;
      let mimeType: string;
      let fileName: string;

      switch (report.type) {
        case 'PDF':
          content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(${report.title}) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n299\n%%EOF`;
          mimeType = 'application/pdf';
          fileName = `${report.title}.pdf`;
          break;
        case 'Excel':
          // 创建CSV格式的Excel兼容内容
          content = `标题,数值,日期\n销售额,100000,2024-03-01\n用户数,5000,2024-03-01\n转化率,3.2%,2024-03-01\n收入,80000,2024-03-02`;
          mimeType = 'application/vnd.ms-excel';
          fileName = `${report.title}.csv`;
          break;
        case 'Word':
          content = `${report.title}\n\n${report.description}\n\n生成日期: ${report.date}\n\n这是一个模拟的Word文档内容。`;
          mimeType = 'application/msword';
          fileName = `${report.title}.txt`;
          break;
        default:
          content = `${report.title}\n${report.description}`;
          mimeType = 'text/plain';
          fileName = `${report.title}.txt`;
      }

      // 创建并下载文件
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success(`${report.title} 下载完成`);
      
      // 清除进度
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[report.id];
          return newProgress;
        });
      }, 1000);

    } catch (error) {
      console.error('下载失败:', error);
      message.error('下载失败，请重试');
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[report.id];
        return newProgress;
      });
    }
  };

  // 真实文件预览
  const handlePreview = async (report: Report) => {
    if (report.status !== 'ready') {
      message.warning('文件还未准备就绪，请稍后再试');
      return;
    }

    // 创建模拟文件用于预览
    const mockFile = await createMockFile(report);
    if (mockFile) {
      setUploadedFile(mockFile);
        setCurrentFileType(report.type as 'PDF' | 'Word' | 'Excel' | 'CSV');;
      setFilePreviewVisible(true);
    }
  };

  // 创建模拟文件
  const createMockFile = async (report: Report): Promise<File | null> => {
    try {
      let content: string | ArrayBuffer;
      let mimeType: string;
      let fileName: string;

      switch (report.type) {
        case 'PDF':
          // 创建一个简单的PDF内容
          content = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 120
>>
stream
BT
/F1 12 Tf
50 750 Td
(${report.title}) Tj
0 -20 Td
(${report.description}) Tj
0 -20 Td
(生成日期: ${report.date}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000273 00000 n 
0000000445 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
523
%%EOF`;
          mimeType = 'application/pdf';
          fileName = `${report.title}.pdf`;
          break;

        case 'Word':
          // 创建一个简单的DOCX文件结构
          const docxContent = await createSimpleDocx(report);
          content = docxContent;
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          fileName = `${report.title}.docx`;
          break;

        case 'Excel':
          // 创建一个简单的XLSX文件
          const xlsxContent = await createSimpleXlsx(report);
          content = xlsxContent;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileName = `${report.title}.xlsx`;
          break;

        case 'CSV':
          // 创建一个简单的CSV文件
          const csvContent = await createSimpleCsv(report);
          content = csvContent;
          mimeType = 'text/csv';
          fileName = `${report.title}.csv`;
          break;

        default:
          return null;
      }

      return new File([content], fileName, { type: mimeType });
    } catch (error) {
      console.error('创建模拟文件失败:', error);
      message.error('文件预览失败');
      return null;
    }
  };

  // 创建简单的DOCX文件
  const createSimpleDocx = async (report: Report): Promise<ArrayBuffer> => {
    // 创建简单的文本内容作为Word文档
    const content = `${report.title}\n\n${report.description}\n\n生成日期: ${report.date}\n\n这是一个模拟的Word文档内容。`;
    return new TextEncoder().encode(content).buffer;
  };

  // 创建简单的XLSX文件
  const createSimpleXlsx = async (report: Report): Promise<ArrayBuffer> => {
    // 创建CSV格式的内容作为Excel兼容文件
    const csvContent = `指标,数值,日期,备注
销售额,100000,2024-03-01,月度统计
用户数,5000,2024-03-01,活跃用户
转化率,3.2%,2024-03-01,购买转化
收入,80000,2024-03-02,实际收入`;
    
    return new TextEncoder().encode(csvContent).buffer;
  };

  // 创建简单的CSV文件
  const createSimpleCsv = async (report: Report): Promise<string> => {
    // 根据报告类型创建不同的CSV内容
    if (report.title.includes('员工')) {
      return `姓名,年龄,部门,职位,入职日期,薪资,城市
张三,28,技术部,前端工程师,2023-01-15,15000,北京
李四,32,技术部,后端工程师,2022-03-20,18000,上海
王五,25,产品部,产品经理,2023-05-10,16000,深圳
赵六,30,设计部,UI设计师,2022-08-12,14000,杭州
孙七,27,技术部,全栈工程师,2023-02-28,17000,北京`;
    }
    
    return `指标,数值,日期,备注,趋势
销售额,100000,2024-03-01,月度统计,上升
用户数,5000,2024-03-01,活跃用户,稳定
转化率,3.2%,2024-03-01,购买转化,下降
收入,80000,2024-03-02,实际收入,上升
访问量,25000,2024-03-03,网站访问,上升`;
  };

  // 处理文件上传
  const handleFileUpload = (file: File) => {
    const fileType = getFileTypeFromFile(file);
    if (!fileType) {
      message.error('不支持的文件类型，仅支持 PDF、Word、Excel、CSV 文件');
      return false;
    }
    
    setUploadedFile(file);
    setCurrentFileType(fileType);
    setFilePreviewVisible(true);
    return false; // 阻止自动上传
  };

  // 根据文件获取类型
  const getFileTypeFromFile = (file: File): 'PDF' | 'Word' | 'Excel' | 'CSV' | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'PDF';
      case 'doc':
      case 'docx':
        return 'Word';
      case 'xls':
      case 'xlsx':
        return 'Excel';
      case 'csv':
        return 'CSV';
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>报告中心</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 文件上传区域 */}
        <Card title="上传文件预览" bordered={false}>
          <Upload.Dragger
            name="file"
            multiple={false}
            beforeUpload={handleFileUpload}
            showUploadList={false}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 PDF、Word、Excel 文件格式
            </p>
          </Upload.Dragger>
        </Card>

        {/* 可用报告列表 */}
        <Card title="可用报告" bordered={false}>
          <List
            itemLayout="horizontal"
            dataSource={reports}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Space key="actions" direction="vertical" size="small">
                    <Space>
                      <Tooltip title={item.status !== 'ready' ? '文件未准备就绪' : '下载报告'}>
                        <Button 
                          type="primary" 
                          icon={<DownloadOutlined />} 
                          size="small"
                          loading={downloadProgress[item.id] !== undefined}
                          disabled={item.status !== 'ready'}
                          onClick={() => handleDownload(item)}
                        >
                          下载
                        </Button>
                      </Tooltip>
                      <Tooltip title={item.status !== 'ready' ? '文件未准备就绪' : '预览报告'}>
                        <Button 
                          type="default" 
                          icon={<EyeOutlined />} 
                          size="small"
                          disabled={item.status !== 'ready'}
                          onClick={() => handlePreview(item)}
                        >
                          预览
                        </Button>
                      </Tooltip>
                    </Space>
                    {downloadProgress[item.id] !== undefined && (
                      <Progress 
                        percent={downloadProgress[item.id]} 
                        size="small" 
                        style={{ width: '120px' }}
                      />
                    )}
                  </Space>
                ]}
              >
                <List.Item.Meta
                  avatar={getFileIcon(item.type)}
                  title={
                    <Space>
                      {item.title}
                      {getStatusTag(item.status)}
                    </Space>
                  }
                  description={
                    <div>
                      <p style={{ margin: '4px 0' }}>{item.description}</p>
                      <Space size="large">
                        <Text type="secondary">生成日期: {item.date}</Text>
                        <Text type="secondary">格式: {item.type}</Text>
                        <Text type="secondary">大小: {item.size}</Text>
                      </Space>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Space>

      {/* 真实文件预览Modal */}
      <Modal
        title={
          <Space>
            {getFileIcon(currentFileType)}
            文件预览
            {uploadedFile && (
              <Text type="secondary">- {uploadedFile.name}</Text>
            )}
          </Space>
        }
        open={filePreviewVisible}
        onCancel={() => {
          setFilePreviewVisible(false);
          setUploadedFile(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setFilePreviewVisible(false);
            setUploadedFile(null);
          }}>
            关闭
          </Button>,
          uploadedFile && (
            <Button 
              key="download" 
              type="primary" 
              icon={<DownloadOutlined />}
              onClick={() => {
                const url = URL.createObjectURL(uploadedFile);
                const link = document.createElement('a');
                link.href = url;
                link.download = uploadedFile.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                message.success('文件下载成功');
              }}
            >
              下载文件
            </Button>
          ),
        ]}
        width={1000}
        style={{ top: 20 }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ height: '70vh' }}>
          <FilePreview
            file={uploadedFile}
            fileType={currentFileType}
            onError={(error) => {
              message.error(error);
            }}
          />
        </div>
      </Modal>

      {/* 旧版预览Modal（用于模拟报告预览） */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            报告预览
            {currentReport && (
              <Text type="secondary">- {currentReport.title}</Text>
            )}
          </Space>
        }
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewContent(null);
          setCurrentReport(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setPreviewVisible(false);
            setPreviewContent(null);
            setCurrentReport(null);
          }}>
            关闭
          </Button>,
          currentReport && (
            <Button 
              key="download" 
              type="primary" 
              icon={<DownloadOutlined />}
              onClick={() => {
                handleDownload(currentReport);
                setPreviewVisible(false);
                setPreviewContent(null);
                setCurrentReport(null);
              }}
            >
              下载文件
            </Button>
          ),
        ]}
        width={800}
        style={{ top: 20 }}
      >
        <Spin spinning={previewLoading}>
          <div style={{ minHeight: '400px' }}>
            {previewContent}
          </div>
        </Spin>
      </Modal>
    </div>
  );
};

export default Reports;