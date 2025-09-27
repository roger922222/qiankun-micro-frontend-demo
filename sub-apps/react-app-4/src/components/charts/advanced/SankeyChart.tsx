import React, { useRef, useEffect, useState } from 'react';
import { Card, Spin } from 'antd';

interface SankeyNode {
  id: string;
  name: string;
  value?: number;
  color?: string;
  level?: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color?: string;
}

interface SankeyProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  config?: {
    width?: number;
    height?: number;
    nodeWidth?: number;
    nodePadding?: number;
    linkOpacity?: number;
    showLabels?: boolean;
    showValues?: boolean;
    margin?: { top: number; right: number; bottom: number; left: number };
    title?: string;
    colorScheme?: string[];
  };
  onNodeClick?: (node: SankeyNode) => void;
  onLinkClick?: (link: SankeyLink) => void;
}

interface ProcessedNode extends SankeyNode {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceLinks: ProcessedLink[];
  targetLinks: ProcessedLink[];
}

interface ProcessedLink extends SankeyLink {
  sourceNode: ProcessedNode;
  targetNode: ProcessedNode;
  y0: number;
  y1: number;
  width: number;
}

const DEFAULT_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

export const SankeyChart: React.FC<SankeyProps> = ({
  nodes,
  links,
  config = {},
  onNodeClick,
  onLinkClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [processedData, setProcessedData] = useState<{
    nodes: ProcessedNode[];
    links: ProcessedLink[];
  }>({ nodes: [], links: [] });

  const {
    width = 800,
    height = 600,
    nodeWidth = 20,
    nodePadding = 10,
    linkOpacity = 0.6,
    showLabels = true,
    showValues = true,
    margin = { top: 20, right: 150, bottom: 20, left: 150 },
    title = 'Sankey Diagram',
    colorScheme = DEFAULT_COLORS
  } = config;

  useEffect(() => {
    if (!nodes.length || !links.length) return;

    const processed = processSankeyData();
    setProcessedData(processed);
    setLoading(false);
  }, [nodes, links, config]);

  const processSankeyData = () => {
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // 创建节点映射
    const nodeMap = new Map<string, ProcessedNode>();
    
    // 初始化节点
    nodes.forEach((node, index) => {
      nodeMap.set(node.id, {
        ...node,
        x: 0,
        y: 0,
        width: nodeWidth,
        height: 0,
        sourceLinks: [],
        targetLinks: [],
        color: node.color || colorScheme[index % colorScheme.length]
      });
    });

    // 创建链接并建立节点关系
    const processedLinks: ProcessedLink[] = links.map(link => {
      const sourceNode = nodeMap.get(link.source);
      const targetNode = nodeMap.get(link.target);
      
      if (!sourceNode || !targetNode) {
        throw new Error(`Invalid link: ${link.source} -> ${link.target}`);
      }

      const processedLink: ProcessedLink = {
        ...link,
        sourceNode,
        targetNode,
        y0: 0,
        y1: 0,
        width: 0,
        color: link.color || sourceNode.color
      };

      sourceNode.sourceLinks.push(processedLink);
      targetNode.targetLinks.push(processedLink);

      return processedLink;
    });

    // 计算节点层级
    const levels = calculateNodeLevels(Array.from(nodeMap.values()), processedLinks);
    const maxLevel = Math.max(...levels.values());

    // 按层级分组节点
    const nodesByLevel: ProcessedNode[][] = [];
    for (let i = 0; i <= maxLevel; i++) {
      nodesByLevel[i] = [];
    }

    nodeMap.forEach((node, id) => {
      const level = levels.get(id) || 0;
      node.level = level;
      nodesByLevel[level].push(node);
    });

    // 计算节点值（如果未指定）
    nodeMap.forEach(node => {
      if (node.value === undefined) {
        const inValue = node.targetLinks.reduce((sum, link) => sum + link.value, 0);
        const outValue = node.sourceLinks.reduce((sum, link) => sum + link.value, 0);
        node.value = Math.max(inValue, outValue);
      }
    });

    // 计算节点位置和大小
    const levelWidth = chartWidth / (maxLevel + 1);
    const totalValue = Math.max(...Array.from(nodeMap.values()).map(n => n.value || 0));
    const valueScale = (chartHeight - nodePadding * (nodes.length - 1)) / totalValue;

    nodesByLevel.forEach((levelNodes, level) => {
      const x = margin.left + level * levelWidth;
      let currentY = margin.top;

      // 按值排序节点
      levelNodes.sort((a, b) => (b.value || 0) - (a.value || 0));

      levelNodes.forEach(node => {
        node.x = x;
        node.y = currentY;
        node.height = (node.value || 0) * valueScale;
        currentY += node.height + nodePadding;
      });
    });

    // 计算链接位置
    processedLinks.forEach(link => {
      link.width = link.value * valueScale;
      
      // 计算源节点的输出位置
      let sourceY = link.sourceNode.y;
      for (const otherLink of link.sourceNode.sourceLinks) {
        if (otherLink === link) break;
        sourceY += otherLink.width;
      }
      
      // 计算目标节点的输入位置
      let targetY = link.targetNode.y;
      for (const otherLink of link.targetNode.targetLinks) {
        if (otherLink === link) break;
        targetY += otherLink.width;
      }
      
      link.y0 = sourceY;
      link.y1 = targetY;
    });

    return {
      nodes: Array.from(nodeMap.values()),
      links: processedLinks
    };
  };

  const calculateNodeLevels = (nodes: ProcessedNode[], links: ProcessedLink[]): Map<string, number> => {
    const levels = new Map<string, number>();
    const visited = new Set<string>();
    const visiting = new Set<string>();

    // 找到所有源节点（没有输入的节点）
    const sourceNodes = nodes.filter(node => 
      !links.some(link => link.target === node.id)
    );

    const dfs = (nodeId: string): number => {
      if (visiting.has(nodeId)) {
        throw new Error('Circular dependency detected');
      }
      if (visited.has(nodeId)) {
        return levels.get(nodeId) || 0;
      }

      visiting.add(nodeId);
      
      const incomingLinks = links.filter(link => link.target === nodeId);
      let maxLevel = 0;
      
      for (const link of incomingLinks) {
        const sourceLevel = dfs(link.source);
        maxLevel = Math.max(maxLevel, sourceLevel + 1);
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      levels.set(nodeId, maxLevel);
      
      return maxLevel;
    };

    // 如果没有明确的源节点，从所有节点开始
    if (sourceNodes.length === 0) {
      nodes.forEach(node => {
        if (!visited.has(node.id)) {
          dfs(node.id);
        }
      });
    } else {
      sourceNodes.forEach(node => dfs(node.id));
      // 确保所有节点都被访问
      nodes.forEach(node => {
        if (!visited.has(node.id)) {
          dfs(node.id);
        }
      });
    }

    return levels;
  };

  const generateLinkPath = (link: ProcessedLink): string => {
    const x0 = link.sourceNode.x + link.sourceNode.width;
    const x1 = link.targetNode.x;
    const y0 = link.y0;
    const y1 = link.y1;
    const y2 = y0 + link.width;
    const y3 = y1 + link.width;

    const curvature = 0.5;
    const xi = (x0 + x1) * curvature + x0 * (1 - curvature);
    const xj = (x0 + x1) * curvature + x1 * (1 - curvature);

    return `M${x0},${y0}C${xi},${y0} ${xj},${y1} ${x1},${y1}L${x1},${y3}C${xj},${y3} ${xi},${y2} ${x0},${y2}Z`;
  };

  const handleNodeClick = (node: ProcessedNode) => {
    onNodeClick?.(node);
  };

  const handleLinkClick = (link: ProcessedLink) => {
    onLinkClick?.(link);
  };

  if (loading) {
    return (
      <Card title={title}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  return (
    <Card title={title} style={{ width: '100%' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block', margin: '0 auto' }}
      >
        {/* 标题 */}
        <text
          x={width / 2}
          y={20}
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#333"
        >
          {title}
        </text>

        {/* 链接 */}
        <g className="links">
          {processedData.links.map((link, index) => (
            <path
              key={`link-${index}`}
              d={generateLinkPath(link)}
              fill={link.color}
              fillOpacity={linkOpacity}
              stroke="none"
              style={{ cursor: 'pointer' }}
              onClick={() => handleLinkClick(link)}
            >
              <title>
                {`${link.sourceNode.name} → ${link.targetNode.name}: ${link.value}`}
              </title>
            </path>
          ))}
        </g>

        {/* 节点 */}
        <g className="nodes">
          {processedData.nodes.map((node, index) => (
            <g key={`node-${index}`}>
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                fill={node.color}
                stroke="#333"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onClick={() => handleNodeClick(node)}
              >
                <title>{`${node.name}: ${node.value}`}</title>
              </rect>
              
              {/* 节点标签 */}
              {showLabels && (
                <text
                  x={node.x < width / 2 ? node.x + node.width + 5 : node.x - 5}
                  y={node.y + node.height / 2}
                  textAnchor={node.x < width / 2 ? 'start' : 'end'}
                  alignmentBaseline="middle"
                  fontSize="12"
                  fill="#333"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.name}
                  {showValues && ` (${node.value})`}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>
    </Card>
  );
};

export default SankeyChart;