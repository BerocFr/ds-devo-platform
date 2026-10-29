import {
  AlignLeft, BadgeCheck, Bell, ChevronsRight, CircleAlert, Footprints, Hash, Heading, Inbox, LayoutGrid, LayoutPanelTop, Link2, ListCollapse, ListOrdered,
  Megaphone, Minus, MousePointerClick, PanelBottom, PanelTop, Quote, RectangleEllipsis, Rows3, SquareCheck, Tag, TextCursorInput, BarChart3, ChevronDownSquare, Type,
} from 'lucide-react';
import type { ComponentKind } from '../../domain/types';

const MAP: Record<ComponentKind, typeof Type> = {
  button: MousePointerClick,
  textInput: TextCursorInput,
  formField: RectangleEllipsis,
  errorMessage: CircleAlert,
  progress: ListOrdered,
  codeInput: Hash,
  confirmation: BadgeCheck,
  heading: Heading,
  text: AlignLeft,
  checkbox: SquareCheck,
  link: Link2,
  alert: Bell,
  card: LayoutGrid,
  divider: Minus,
  navBar: PanelTop,
  siteHeader: LayoutPanelTop,
  siteFooter: PanelBottom,
  tabs: Rows3,
  accordion: ListCollapse,
  tag: Tag,
  emptyState: Inbox,
  breadcrumbs: ChevronsRight,
  hero: Megaphone,
  ctaBand: Footprints,
  stat: BarChart3,
  testimonial: Quote,
  select: ChevronDownSquare,
  textarea: Type,
};

export function ComponentGlyph({ kind, size = 14 }: { kind: ComponentKind; size?: number }) {
  const I = MAP[kind] ?? LayoutGrid;
  return <I size={size} aria-hidden />;
}
