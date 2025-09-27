// 数据导出管理器

interface ChartData {
  id: string;
  title: string;
  type: string;
  data: any[];
  config: any;
  element?: HTMLElement;
}

interface PDFExportOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a3' | 'letter';
  quality?: number;
  includeCharts?: boolean;
  includeData?: boolean;
}

interface ExcelExportOptions {
  sheetName?: string;
  includeCharts?: boolean;
  formatData?: boolean;
  fileName?: string;
}

interface ImageExportOptions {
  format?: 'png' | 'jpeg' | 'webp' | 'svg';
  quality?: number;
  scale?: number;
  backgroundColor?: string;
  width?: number;
  height?: number;
}

export class ExportManager {
  private loadedLibraries = new Set<string>();

  // 动态加载库
  private async loadLibrary(name: string): Promise<any> {
    if (this.loadedLibraries.has(name)) {
      return;
    }

    switch (name) {
      case 'jspdf':
        const jsPDF = await import('jspdf');
        this.loadedLibraries.add(name);
        return jsPDF;
        
      case 'xlsx':
        const XLSX = await import('xlsx');
        this.loadedLibraries.add(name);
        return XLSX;
        
      case 'html2canvas':
        const html2canvas = await import('html2canvas');
        this.loadedLibraries.add(name);
        return html2canvas.default;
        
      default:
        throw new Error(`Unknown library: ${name}`);
    }
  }

  // PDF 导出
  async exportToPDF(data: ChartData[], options: PDFExportOptions = {}): Promise<void> {
    const jsPDFModule = await this.loadLibrary('jspdf');
    const { jsPDF } = jsPDFModule;
    
    const doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // 添加标题
    if (options.title) {
      doc.setFontSize(20);
      doc.text(options.title, margin, currentY);
      currentY += 15;
    }

    // 添加生成时间
    doc.setFontSize(10);
    doc.text(`生成时间: ${new Date().toLocaleString()}`, margin, currentY);
    currentY += 10;

    // 导出图表
    if (options.includeCharts !== false) {
      for (const chart of data) {
        // 检查是否需要新页面
        if (currentY > pageHeight - 120) {
          doc.addPage();
          currentY = margin;
        }

        // 添加图表标题
        doc.setFontSize(14);
        doc.text(chart.title, margin, currentY);
        currentY += 10;

        try {
          if (chart.element) {
            const canvas = await this.renderChartToCanvas(chart.element, {
              scale: 2,
              backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 2 * margin;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            doc.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
          }
        } catch (error) {
          console.error(`Failed to export chart ${chart.id}:`, error);
          doc.setFontSize(10);
          doc.text(`图表导出失败: ${error.message}`, margin, currentY);
          currentY += 10;
        }
      }
    }

    // 导出数据表格
    if (options.includeData) {
      doc.addPage();
      currentY = margin;
      
      doc.setFontSize(16);
      doc.text('数据详情', margin, currentY);
      currentY += 15;

      for (const chart of data) {
        if (currentY > pageHeight - 50) {
          doc.addPage();
          currentY = margin;
        }

        doc.setFontSize(12);
        doc.text(chart.title, margin, currentY);
        currentY += 8;

        // 简单的数据表格
        const tableData = this.formatDataForTable(chart.data);
        if (tableData.length > 0) {
          doc.setFontSize(8);
          tableData.slice(0, 10).forEach((row, index) => {
            const text = Array.isArray(row) ? row.join(' | ') : String(row);
            doc.text(text.substring(0, 80), margin, currentY);
            currentY += 5;
          });
          
          if (tableData.length > 10) {
            doc.text(`... 还有 ${tableData.length - 10} 行数据`, margin, currentY);
            currentY += 5;
          }
        }
        
        currentY += 10;
      }
    }

    // 保存文件
    const fileName = `dashboard-export-${Date.now()}.pdf`;
    doc.save(fileName);
    
    console.log(`PDF exported: ${fileName}`);
  }

  // Excel 导出
  async exportToExcel(data: ChartData[], options: ExcelExportOptions = {}): Promise<void> {
    const XLSX = await this.loadLibrary('xlsx');
    const wb = XLSX.utils.book_new();

    // 为每个图表创建一个工作表
    data.forEach((chart, index) => {
      const sheetName = chart.title.replace(/[^\w\s]/gi, '').substring(0, 31) || `Sheet${index + 1}`;
      
      let sheetData: any[] = [];
      
      if (options.formatData) {
        // 格式化数据
        sheetData = this.formatDataForExcel(chart.data, chart.type);
      } else {
        // 原始数据
        sheetData = Array.isArray(chart.data) ? chart.data : [chart.data];
  private async renderChartToCanvas(element: HTMLElement, options: any = {}): Promise<HTMLCanvasElement> {
    const html2canvasModule = await this.loadLibrary('html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;
      const ws = XLSX.utils.json_to_sheet(sheetData);
      
      // 设置列宽
      const colWidths = this.calculateColumnWidths(sheetData);
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // 添加汇总表
    if (data.length > 1) {
      const summaryData = data.map(chart => ({
        '图表名称': chart.title,
        '图表类型': chart.type,
        '数据行数': Array.isArray(chart.data) ? chart.data.length : 1,
        '导出时间': new Date().toLocaleString()
      }));
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, '汇总');
    }

    // 保存文件
    const fileName = options.fileName || `dashboard-export-${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    console.log(`Excel exported: ${fileName}`);
  }

  // 高质量图片导出
  async exportToImage(chartElement: HTMLElement, options: ImageExportOptions = {}): Promise<string> {
    const format = options.format || 'png';
    
    if (format === 'svg') {
      return this.exportToSVG(chartElement);
    }
    
    const html2canvasModule = await this.loadLibrary('html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;
    
    const canvas = await html2canvas(chartElement, {
      scale: options.scale || 2,
      useCORS: true,
      backgroundColor: options.backgroundColor || '#ffffff',
      width: options.width,
      height: options.height,
      logging: false
    });
    
    const quality = format === 'jpeg' ? (options.quality || 0.95) : undefined;
    const dataUrl = canvas.toDataURL(`image/${format}`, quality);
    
    // 触发下载
    this.downloadDataUrl(dataUrl, `chart-export-${Date.now()}.${format}`);
    
    return dataUrl;
  }

  private async exportToSVG(element: HTMLElement): Promise<string> {
    // 查找 SVG 元素
    const svgElement = element.querySelector('svg');
    if (!svgElement) {
      throw new Error('No SVG element found in the chart');
    }
    
    // 克隆 SVG
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    
    // 添加样式
    const styles = this.extractStyles(element);
    if (styles) {
      const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleElement.textContent = styles;
      clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
    }
    
    // 设置命名空间
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    
    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
    
    this.downloadDataUrl(dataUrl, `chart-export-${Date.now()}.svg`);
    
    return dataUrl;
  }

  private async renderChartToCanvas(element: HTMLElement, options: any = {}): Promise<HTMLCanvasElement> {
    const html2canvas = await this.loadLibrary('html2canvas');
    
    return html2canvas(element, {
      scale: options.scale || 2,
      useCORS: true,
      backgroundColor: options.backgroundColor || '#ffffff',
      logging: false,
      ...options
    });
  }

  private formatDataForTable(data: any[]): string[] {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => {
      if (typeof item === 'object') {
        return Object.values(item).join(' | ');
      }
      return String(item);
    });
  }

  private formatDataForExcel(data: any[], chartType: string): any[] {
    if (!Array.isArray(data)) return [data];
    
    // 根据图表类型格式化数据
    switch (chartType) {
      case 'line':
      case 'area':
        return data.map(item => ({
          'X轴': item.x || item.date || item.category,
          'Y轴': item.y || item.value || item.count,
          '系列': item.series || item.type || '默认'
        }));
        
      case 'bar':
      case 'column':
        return data.map(item => ({
          '分类': item.category || item.name || item.x,
          '数值': item.value || item.y || item.count,
          '系列': item.series || item.type || '默认'
        }));
        
      case 'pie':
        return data.map(item => ({
          '标签': item.label || item.name || item.category,
          '数值': item.value || item.count,
          '百分比': item.percentage || ((item.value / data.reduce((sum, d) => sum + (d.value || 0), 0)) * 100).toFixed(2) + '%'
        }));
        
      default:
        return data;
    }
  }

  private calculateColumnWidths(data: any[]): any[] {
    if (!data.length) return [];
    
    const keys = Object.keys(data[0]);
    return keys.map(key => {
      const maxLength = Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      );
      return { wch: Math.min(Math.max(maxLength, 10), 50) };
    });
  }

  private extractStyles(element: HTMLElement): string {
    const styleSheets = Array.from(document.styleSheets);
    let styles = '';
    
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules || []);
        rules.forEach(rule => {
          if (rule.type === CSSRule.STYLE_RULE) {
            const styleRule = rule as CSSStyleRule;
            if (element.querySelector(styleRule.selectorText)) {
              styles += styleRule.cssText + '\n';
            }
          }
        });
      } catch (e) {
        // 跨域样式表访问限制
      }
    });
    
    return styles;
  }

  private downloadDataUrl(dataUrl: string, fileName: string): void {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 批量导出
  async batchExport(charts: ChartData[], formats: Array<'pdf' | 'excel' | 'png' | 'svg'>): Promise<void> {
    const exportPromises = formats.map(async (format) => {
      try {
        switch (format) {
          case 'pdf':
            await this.exportToPDF(charts);
            break;
          case 'excel':
            await this.exportToExcel(charts);
            break;
          case 'png':
            for (const chart of charts) {
              if (chart.element) {
                await this.exportToImage(chart.element, { format: 'png' });
              }
            }
            break;
          case 'svg':
            for (const chart of charts) {
              if (chart.element) {
                await this.exportToImage(chart.element, { format: 'svg' });
              }
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to export ${format}:`, error);
      }
    });

    await Promise.allSettled(exportPromises);
  }
}

// 单例导出
export const exportManager = new ExportManager();