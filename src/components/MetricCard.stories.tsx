import type { Meta,StoryObj } from '@storybook/react';
import { MetricCard } from './MetricCard';
const meta:Meta<typeof MetricCard>={title:'Dashboard/Metric Card',component:MetricCard,args:{label:'Total AUM',value:'$45.00B',trend:'+2.4% vs last quarter'}};export default meta;type Story=StoryObj<typeof MetricCard>;export const Default:Story={};export const DailyPnL:Story={args:{label:'Daily P&L',value:'+$12.45M',trend:'+0.28% today'}};
