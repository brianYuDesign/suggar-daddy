declare module 'recharts' {
  import * as React from 'react';

  export interface ResponsiveContainerProps {
    width?: string | number;
    height?: string | number;
    minWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }

  export class ResponsiveContainer extends React.Component<ResponsiveContainerProps> {}

  export interface ChartProps {
    data?: Record<string, unknown>[];
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
    width?: number;
    height?: number;
    children?: React.ReactNode;
  }

  export class LineChart extends React.Component<ChartProps> {}
  export class AreaChart extends React.Component<ChartProps> {}
  export class PieChart extends React.Component<ChartProps> {}

  export interface LineProps {
    type?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter';
    dataKey: string;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    name?: string;
    dot?: boolean | object;
    activeDot?: boolean | object;
  }

  export class Line extends React.Component<LineProps> {}

  export interface AreaProps {
    type?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter';
    dataKey: string;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    fillOpacity?: number;
    name?: string;
  }

  export class Area extends React.Component<AreaProps> {}

  export interface XAxisProps {
    dataKey?: string;
    tick?: { fill?: string; fontSize?: number };
    tickFormatter?: (value: string | number) => string;
    stroke?: string;
  }

  export class XAxis extends React.Component<XAxisProps> {}

  export interface YAxisProps {
    tick?: { fill?: string; fontSize?: number };
    tickFormatter?: (value: string | number) => string;
    stroke?: string;
  }

  export class YAxis extends React.Component<YAxisProps> {}

  export interface CartesianGridProps {
    strokeDasharray?: string;
    stroke?: string;
  }

  export class CartesianGrid extends React.Component<CartesianGridProps> {}

  export interface TooltipProps {
    content?: React.ReactElement | ((props: Record<string, unknown>) => React.ReactElement | null);
  }

  export class Tooltip extends React.Component<TooltipProps> {}

  export interface LegendProps {
    wrapperStyle?: React.CSSProperties;
    formatter?: (value: string) => React.ReactNode;
    verticalAlign?: 'top' | 'middle' | 'bottom';
    align?: 'left' | 'center' | 'right';
    layout?: 'horizontal' | 'vertical';
  }

  export class Legend extends React.Component<LegendProps> {}

  export interface PieProps {
    data?: Record<string, unknown>[];
    cx?: string | number;
    cy?: string | number;
    innerRadius?: string | number;
    outerRadius?: string | number;
    paddingAngle?: number;
    dataKey?: string;
    nameKey?: string;
    children?: React.ReactNode;
  }

  export class Pie extends React.Component<PieProps> {}

  export interface CellProps {
    fill?: string;
    stroke?: string;
  }

  export class Cell extends React.Component<CellProps> {}
}
