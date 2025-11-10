import React, { useState } from 'react';
import { 
  Button, 
  Dropdown, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Checkbox, 
  Progress,
  message,
  Tooltip
} from 'antd';
import { 
  DownloadOutlined, 
  FileImageOutlined, 
  FilePdfOutlined, 
  FileExcelOutlined,
  ShareAltOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { exportManager } from '../../utils/export-manager';
import { shareManager } from '../../utils/share-manager';

interface ExportPanelProps {
  chartElements?: HTMLElement[];
  data?: any[];
  title?: string;
  onExportStart?: () => void;
  onExportComplete?: (format: string) => void;
  onExportError?: (error: Error) => void;
}

interface ExportConfig {
  formats: string[];
  includeCharts: boolean;
  includeData: boolean;
  quality: number;
  fileName: string;
}

interface ShareConfig {
  expirationDays: number;
  maxAccess?: number;
  password?: string;
  allowDownload: boolean;
  allowEdit: boolean;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  chartElements = [],
  data = [],
  title = 'Dashboard Export',
  onExportStart,
  onExportComplete,
  onExportError
}) => {
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');

  const [exportForm] = Form.useForm();
  const [shareForm] = Form.useForm();

  // 导出菜单项
  const exportMenuItems = [
    {
      key: 'pdf',
      label: (
        <Space>
          <FilePdfOutlined />
          导出 PDF
        </Space>
      ),
      onClick: () => handleQuickExport('pdf')
    },
    {
      key: 'excel',
      label: (
        <Space>
          <FileExcelOutlined />
          导出 Excel
        </Space>
      ),
      onClick: () => handleQuickExport('excel')
    },
    {
      key: 'png',
      label: (
        <Space>
          <FileImageOutlined />
          导出 PNG
        </Space>
      ),
      onClick: () => handleQuickExport('png')
    },
    {
      type: 'divider' as const
    },
    {
      key: 'custom',
      label: (
        <Space>
          <SettingOutlined />
          自定义导出
        </Space>
      ),
      onClick: () => setExportModalVisible(true)
    }
  ];

  // 快速导出
  const handleQuickExport = async (format: string) => {
    if (chartElements.length === 0 && data.length === 0) {
      message.warning('没有可导出的内容');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    onExportStart?.();

    try {
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const chartData = chartElements.map((element, index) => ({
        id: `chart-${index}`,
        title: `Chart ${index + 1}`,
        type: 'chart',
        data: data[index] || [],
        config: {},
        element
      }));

      switch (format) {
        case 'pdf':
          await exportManager.exportToPDF(chartData, {
            title,
            includeCharts: true,
            includeData: true
          });
          break;
        case 'excel':
          await exportManager.exportToExcel(chartData, {
            fileName: `${title}-${Date.now()}.xlsx`
          });
          break;
        case 'png':
          for (const element of chartElements) {
            await exportManager.exportToImage(element, { format: 'png' });
          }
          break;
      }

      clearInterval(progressInterval);
      setExportProgress(100);
      
      setTimeout(() => {
        setExportProgress(0);
        setIsExporting(false);
        onExportComplete?.(format);
        message.success(`${format.toUpperCase()} 导出成功`);
      }, 500);

    } catch (error) {
      setIsExporting(false);
      setExportProgress(0);
      onExportError?.(error as Error);
      message.error(`导出失败: ${error.message}`);
    }
  };

  // 自定义导出
  const handleCustomExport = async (values: ExportConfig) => {
    setIsExporting(true);
    setExportProgress(0);
    setExportModalVisible(false);
    onExportStart?.();

    try {
      const chartData = chartElements.map((element, index) => ({
        id: `chart-${index}`,
        title: `Chart ${index + 1}`,
        type: 'chart',
        data: data[index] || [],
        config: {},
        element
      }));

      const progressStep = 100 / values.formats.length;
      let currentProgress = 0;

      for (const format of values.formats) {
        switch (format) {
          case 'pdf':
            await exportManager.exportToPDF(chartData, {
              title: values.fileName,
              includeCharts: values.includeCharts,
              includeData: values.includeData,
              quality: values.quality / 100
            });
            break;
          case 'excel':
            await exportManager.exportToExcel(chartData, {
              fileName: `${values.fileName}.xlsx`,
              includeCharts: values.includeCharts,
              formatData: true
            });
            break;
          case 'png':
          case 'svg':
            for (const element of chartElements) {
              await exportManager.exportToImage(element, {
                format: format as 'png' | 'svg',
                quality: values.quality / 100,
                scale: 2
              });
            }
            break;
        }
        
        currentProgress += progressStep;
        setExportProgress(currentProgress);
      }

      setExportProgress(100);
      
      setTimeout(() => {
        setExportProgress(0);
        setIsExporting(false);
        onExportComplete?.(values.formats.join(', '));
        message.success('自定义导出完成');
      }, 500);

    } catch (error) {
      setIsExporting(false);
      setExportProgress(0);
      onExportError?.(error as Error);
      message.error(`导出失败: ${error.message}`);
    }
  };

  // 生成分享链接
  const handleShare = async (values: ShareConfig) => {
    try {
      message.loading('正在生成分享链接...', 0);

      const dashboardConfig = {
        layout: {},
        filters: {},
        charts: data,
        theme: 'default',
        permissions: [{ type: 'read' as const, level: 1 }],
        metadata: {
          title,
          description: '数据看板分享',
          tags: ['dashboard', 'export']
        }
      };

      const shareResult = await shareManager.generateShareLink(dashboardConfig, {
        expirationDays: values.expirationDays,
        maxAccess: values.maxAccess,
        password: values.password,
        allowDownload: values.allowDownload,
        allowEdit: values.allowEdit
      });

      setShareLink(shareResult.url);
      setQrCode(shareResult.qrCode);
      
      message.destroy();
      message.success('分享链接生成成功');
      
    } catch (error) {
      message.destroy();
      message.error(`生成分享链接失败: ${error.message}`);
    }
  };

  // 复制分享链接
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      message.success('链接已复制到剪贴板');
    } catch (error) {
      message.error('复制失败，请手动复制');
    }
  };

  return (
    <>
      <Space>
        <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            loading={isExporting}
            disabled={chartElements.length === 0 && data.length === 0}
          >
            导出
          </Button>
        </Dropdown>

        <Tooltip title="生成分享链接">
          <Button 
            icon={<ShareAltOutlined />}
            onClick={() => setShareModalVisible(true)}
            disabled={data.length === 0}
          >
            分享
          </Button>
        </Tooltip>
      </Space>

      {/* 导出进度 */}
      {isExporting && (
        <div style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          background: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: '300px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            正在导出...
          </div>
          <Progress percent={exportProgress} status="active" />
        </div>
      )}

      {/* 自定义导出弹窗 */}
      <Modal
        title="自定义导出"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        onOk={() => exportForm.submit()}
        width={600}
      >
        <Form
          form={exportForm}
          layout="vertical"
          onFinish={handleCustomExport}
          initialValues={{
            formats: ['pdf'],
            includeCharts: true,
            includeData: true,
            quality: 95,
            fileName: title
          }}
        >
          <Form.Item
            label="导出格式"
            name="formats"
            rules={[{ required: true, message: '请选择导出格式' }]}
          >
            <Checkbox.Group>
              <Space direction="vertical">
                <Checkbox value="pdf">PDF 文档</Checkbox>
                <Checkbox value="excel">Excel 表格</Checkbox>
                <Checkbox value="png">PNG 图片</Checkbox>
                <Checkbox value="svg">SVG 矢量图</Checkbox>
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item label="导出内容">
            <Form.Item name="includeCharts" valuePropName="checked" noStyle>
              <Checkbox>包含图表</Checkbox>
            </Form.Item>
            <Form.Item name="includeData" valuePropName="checked" noStyle>
              <Checkbox style={{ marginLeft: 16 }}>包含数据</Checkbox>
            </Form.Item>
          </Form.Item>

          <Form.Item
            label="图片质量"
            name="quality"
          >
            <Select>
              <Select.Option value={70}>标准 (70%)</Select.Option>
              <Select.Option value={85}>高质量 (85%)</Select.Option>
              <Select.Option value={95}>最高质量 (95%)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="文件名"
            name="fileName"
            rules={[{ required: true, message: '请输入文件名' }]}
          >
            <Input placeholder="请输入文件名" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分享弹窗 */}
      <Modal
        title="生成分享链接"
        open={shareModalVisible}
        onCancel={() => {
          setShareModalVisible(false);
          setShareLink('');
          setQrCode('');
        }}
        footer={null}
        width={600}
      >
        {!shareLink ? (
          <Form
            form={shareForm}
            layout="vertical"
            onFinish={handleShare}
            initialValues={{
              expirationDays: 7,
              allowDownload: true,
              allowEdit: false
            }}
          >
            <Form.Item
              label="过期时间"
              name="expirationDays"
              rules={[{ required: true, message: '请选择过期时间' }]}
            >
              <Select>
                <Select.Option value={1}>1天</Select.Option>
                <Select.Option value={3}>3天</Select.Option>
                <Select.Option value={7}>7天</Select.Option>
                <Select.Option value={30}>30天</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="访问限制"
              name="maxAccess"
            >
              <Select placeholder="不限制访问次数" allowClear>
                <Select.Option value={10}>10次</Select.Option>
                <Select.Option value={50}>50次</Select.Option>
                <Select.Option value={100}>100次</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="访问密码"
              name="password"
            >
              <Input.Password placeholder="可选，设置访问密码" />
            </Form.Item>

            <Form.Item label="权限设置">
              <Form.Item name="allowDownload" valuePropName="checked" noStyle>
                <Checkbox>允许下载</Checkbox>
              </Form.Item>
              <Form.Item name="allowEdit" valuePropName="checked" noStyle>
                <Checkbox style={{ marginLeft: 16 }}>允许编辑</Checkbox>
              </Form.Item>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                生成分享链接
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <strong>分享链接已生成：</strong>
            </div>
            
            <Input.Group compact style={{ marginBottom: '16px' }}>
              <Input 
                value={shareLink} 
                readOnly 
                style={{ width: 'calc(100% - 80px)' }}
              />
              <Button onClick={handleCopyLink}>复制</Button>
            </Input.Group>

            {qrCode && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>扫码访问：</strong>
                </div>
                <img src={qrCode} alt="QR Code" style={{ maxWidth: '200px' }} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default ExportPanel;