/**
 * UI Components Barrel Export
 * 
 * This file consolidates the most frequently imported UI components
 * to reduce import duplication across the application.
 * 
 * Instead of:
 *   import { Button } from '@/components/ui/button';
 *   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 *   import { Badge } from '@/components/ui/badge';
 * 
 * Use:
 *   import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
 */

// Most frequently used components based on codebase analysis
export { Button } from './button';
export { Badge } from './badge';
export { 
  Card, 
  CardContent, 
  CardDescription,
  CardFooter,
  CardHeader, 
  CardTitle 
} from './card';
export { 
  Select, 
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger, 
  SelectValue 
} from './select';
export { useToast } from './use-toast';
export { Toaster } from './toaster';
export { Toaster as SonnerToaster } from './sonner';
export { toast } from 'sonner';

// Form components
export { Input } from './input';
export { Label } from './label';
export { Textarea } from './textarea';
export { Checkbox } from './checkbox';
export { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from './form';

// Layout components
export { Separator } from './separator';
export { Skeleton } from './skeleton';
export { ScrollArea } from './scroll-area';

// Dialog and modals
export { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './dialog';
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';

// Navigation components
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';

// Data display
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
export { Avatar, AvatarFallback, AvatarImage } from './avatar';

// Feedback components
export { Alert, AlertDescription, AlertTitle } from './alert';
export { Progress } from './progress';

// Utility components
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { Switch } from './switch';

// Layout components
export { CenteredFormLayout } from './centered-form-layout';

// Typography components
export { SectionTitle, StatNumber, ErrorTitle, CenteredTitle } from './typography';
export { PageTitle } from '../page-title';