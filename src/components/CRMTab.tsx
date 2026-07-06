/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AppState 
} from '../db/store';
import { 
  User, 
  CRMCustomer, 
  CRMQuotation, 
  CRMQuotationItem, 
  CRMFollowUp, 
  CRMPayment, 
  CRMNote, 
  CRMAttachment, 
  CRMTimelineEvent,
  Order,
  Payment,
  OrderStage,
  OrderPriority
} from '../types';
import {
  Users,
  ClipboardList,
  Contact,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  Search,
  Grid,
  List,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Phone,
  Mail,
  FileUp,
  Link,
  MessageSquare,
  Activity,
  UserCheck,
  Building,
  MapPin,
  FileSpreadsheet,
  ArrowRight,
  Star,
  Settings,
  X,
  FileCheck,
  UserPlus,
  Camera,
  Upload
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface CRMTabProps {
  db: AppState;
  onSaveCRMCustomer: (customer: CRMCustomer) => void;
  onDeleteCRMCustomer: (id: string) => void;
  onSaveCRMQuotation: (quotation: CRMQuotation) => void;
  onDeleteCRMQuotation: (id: string) => void;
  onSaveCRMFollowUp: (followUp: CRMFollowUp) => void;
  onDeleteCRMFollowUp: (id: string) => void;
  onSaveCRMPayment: (payment: CRMPayment) => void;
  onDeleteCRMPayment: (id: string) => void;
  onSaveCRMNote: (note: CRMNote) => void;
  onDeleteCRMNote: (id: string) => void;
  onSaveCRMAttachment: (attachment: CRMAttachment) => void;
  onDeleteCRMAttachment: (id: string) => void;
  onSaveCRMTimelineEvent: (event: CRMTimelineEvent) => void;
  onSaveOrder: (order: Order, customer?: any) => void;
  currentUser: User;
  users: User[];
}

export default function CRMTab({
  db,
  onSaveCRMCustomer,
  onDeleteCRMCustomer,
  onSaveCRMQuotation,
  onDeleteCRMQuotation,
  onSaveCRMFollowUp,
  onDeleteCRMFollowUp,
  onSaveCRMPayment,
  onDeleteCRMPayment,
  onSaveCRMNote,
  onDeleteCRMNote,
  onSaveCRMAttachment,
  onDeleteCRMAttachment,
  onSaveCRMTimelineEvent,
  onSaveOrder,
  currentUser,
  users
}: CRMTabProps) {
  const [subTab, setSubTab] = React.useState<'dashboard' | 'customers' | 'quotations' | 'followups'>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  
  // Dialog States
  const [showAddCustModal, setShowAddCustModal] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<CRMCustomer | null>(null);
  const [showAddQuoteModal, setShowAddQuoteModal] = React.useState(false);
  const [showAddFollowupModal, setShowAddFollowupModal] = React.useState(false);

  // Attachment Dialog States
  const [showAttachmentModal, setShowAttachmentModal] = React.useState(false);
  const [attachCategory, setAttachCategory] = React.useState<'Design Image' | 'Reference Photo' | 'PDF' | 'CAD Drawing' | 'Invoice' | 'Agreement'>('Design Image');
  const [attachFileName, setAttachFileName] = React.useState('');
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [uploadedFileData, setUploadedFileData] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    setUploadedFileData(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error("Error accessing camera: ", err);
      const isPermissionDenied = err.name === 'NotAllowedError' || err.message?.includes('Permission dismissed') || err.message?.includes('Permission denied');
      if (isPermissionDenied) {
        alert("Camera Permission was dismissed or denied. Because the app is running in an embedded preview frame, some browsers block media access. To fix this:\n\n1. Open the app in a new tab using the diagonal arrow icon at the top right of the screen.\n2. Allow camera access when prompted.\n\nAlternatively, you can click the 'From Computer' button to select any sketch design, PDF, or image file directly from your device!");
      } else {
        alert("Could not access the camera. Please open the app in a new tab to grant permissions, or use the standard file uploader instead.");
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachFileName(file.name.split('.').slice(0, -1).join('.') || file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedFileData(event.target?.result as string);
        setCapturedImage(null); // Clear camera capture if they upload a file
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUploadedAttachment = () => {
    if (!selectedCustomerId) return;
    const finalDataUrl = capturedImage || uploadedFileData;
    if (!finalDataUrl) {
      alert("Please upload a file or take a camera snapshot first.");
      return;
    }
    if (!attachFileName.trim()) {
      alert("Please enter a file description or name.");
      return;
    }
    
    handleAddAttachment(selectedCustomerId, attachCategory, attachFileName, finalDataUrl);
    
    // Reset state & close modal
    setShowAttachmentModal(false);
    setAttachFileName('');
    setCapturedImage(null);
    setUploadedFileData(null);
    stopCamera();
  };

  // Filter States for Customer Directory
  const [custSearch, setCustSearch] = React.useState('');
  const [custViewMode, setCustViewMode] = React.useState<'grid' | 'table'>('table');
  const [custFilter, setCustFilter] = React.useState<'all' | 'active' | 'repeat' | 'pending_payment' | 'completed' | 'vip'>('all');

  const isAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager';
  const isArtisan = currentUser.role === 'carpenter' || currentUser.role === 'polish_person';
  const hasWriteAccess = isAdmin || isManager;

  // Initial customer selections
  React.useEffect(() => {
    if (db.crmCustomers && db.crmCustomers.length > 0 && !selectedCustomerId) {
      // Don't auto-select to let dashboard load, but if they enter customer tab we can help
    }
  }, [db.crmCustomers]);

  // Helper: auto-generate sequential IDs
  const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substring(2, 9)}`;

  // Customer journey status and sync helpers
  const getCustomerStatus = (cust: CRMCustomer): string => {
    if (cust.status === 'Cancelled') return 'Cancelled';
    if (cust.status === 'Delivered') return 'Delivered';

    const custOrders = db.orders?.filter(o => o.customer_id === cust.id) || [];
    const hasInProduction = custOrders.some(o => o.current_status !== 'Pending' && o.current_status !== 'Dispatched');
    const hasDelivered = custOrders.length > 0 && custOrders.every(o => o.current_status === 'Dispatched');

    if (hasInProduction) {
      return 'In Production';
    } else if (hasDelivered && cust.status === 'Order Confirmed') {
      return 'Delivered';
    }

    return cust.status || 'New Inquiry';
  };

  const getStatusLabelWithEmoji = (status: string): string => {
    switch (status) {
      case 'New Inquiry': return '🟥 New Inquiry';
      case 'Quotation Pending': return '🟨 Quotation Pending';
      case 'Quotation Sent': return '🟦 Quotation Sent';
      case 'Follow-up': return '🟪 Follow-up';
      case 'Order Confirmed': return '🟩 Order Confirmed';
      case 'In Production': return '🏭 In Production';
      case 'Delivered': return '🟫 Delivered';
      case 'Cancelled': return '⚫ Cancelled';
      default: return '🟥 New Inquiry';
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'New Inquiry': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Quotation Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Quotation Sent': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Follow-up': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Order Confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Production': return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'Delivered': return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'Cancelled': return 'bg-stone-100 text-stone-600 border-stone-200';
      default: return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  const checkAndTriggerOrderCreation = (customer: CRMCustomer) => {
    const alreadyOrdered = db.orders?.some(o => o.customer_id === customer.id && (o.special_notes?.includes('Converted from Quotation') || o.special_notes?.includes('Directly confirmed from CRM')));
    if (alreadyOrdered) {
      console.log("Order already exists for this customer.");
      return;
    }

    const latestQuote = db.crmQuotations?.filter(q => q.customer_id === customer.id)
      .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (latestQuote) {
      if (latestQuote.status !== 'Approved') {
        onSaveCRMQuotation({ ...latestQuote, status: 'Approved' });
      }

      const orderId = generateId('order');
      const articleNo = `${new Date().getFullYear().toString().slice(-2)}/${String(new Date().getMonth() + 1).padStart(2, '0')}/QU/${Math.floor(1000 + Math.random() * 9000)}`;
      
      const firstItem = latestQuote.items?.[0];
      const newOrder: Order = {
        id: orderId,
        article_no: articleNo,
        customer_id: latestQuote.customer_id,
        category: 'Living Room',
        sub_category: firstItem?.furnitureItem || 'Bespoke Item',
        size: 'Custom',
        custom_size: firstItem?.dimensions || 'Custom Size',
        finish: 'Premium Lacquer Polish',
        special_notes: `Converted from Quotation ${latestQuote.id}. ${latestQuote.notes || ''}`,
        design_type: 'Custom',
        material: firstItem?.material || 'Premium Plywood & Teak Veneer',
        color_shade: 'Teak / Walnut',
        no_of_units: firstItem?.quantity || 1,
        carpenter_id: users.find(u => u.role === 'carpenter')?.id || 'user_rinku_v_prod',
        current_status: 'Pending',
        is_delayed: false,
        priority: 'normal',
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: latestQuote.validUntil,
        portal_token: Math.random().toString(36).substring(2, 10),
        portal_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        qr_token: `https://bhisesworkshop.com/order/${orderId}`,
        created_at: new Date().toISOString(),
        created_by: currentUser.id,
        images: []
      };

      onSaveOrder(newOrder);

      const crmPay: CRMPayment = {
        id: generateId('pay'),
        customer_id: latestQuote.customer_id,
        order_id: orderId,
        total_amount: latestQuote.totalAmount,
        advance_paid: Math.round(latestQuote.totalAmount * 0.4),
        balance_due: Math.round(latestQuote.totalAmount * 0.6),
        payment_method: 'UPI',
        payment_date: new Date().toISOString().split('T')[0],
        pending_amount: Math.round(latestQuote.totalAmount * 0.6)
      };
      onSaveCRMPayment(crmPay);

      onSaveCRMTimelineEvent({
        id: generateId('evt'),
        customer_id: latestQuote.customer_id,
        type: 'quotation_approved',
        title: 'Order Confirmed & Created',
        description: `Quotation ${latestQuote.id} approved. Production Order #${articleNo} initialized into production.`,
        timestamp: new Date().toISOString(),
        operator: currentUser.name
      });
    } else {
      const orderId = generateId('order');
      const articleNo = `${new Date().getFullYear().toString().slice(-2)}/${String(new Date().getMonth() + 1).padStart(2, '0')}/CRM/${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newOrder: Order = {
        id: orderId,
        article_no: articleNo,
        customer_id: customer.id,
        category: 'Living Room',
        sub_category: 'Bespoke Woodwork Item',
        size: 'Custom',
        custom_size: 'Standard / Custom Size',
        finish: 'Premium Lacquer Polish',
        special_notes: `Directly confirmed from CRM Lead Status update. No formal quotation recorded.`,
        design_type: 'Custom',
        material: 'Premium Plywood & Teak Wood',
        color_shade: 'Teak / Walnut',
        no_of_units: 1,
        carpenter_id: users.find(u => u.role === 'carpenter')?.id || 'user_rinku_v_prod',
        current_status: 'Pending',
        is_delayed: false,
        priority: 'normal',
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        portal_token: Math.random().toString(36).substring(2, 10),
        portal_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        qr_token: `https://bhisesworkshop.com/order/${orderId}`,
        created_at: new Date().toISOString(),
        created_by: currentUser.id,
        images: []
      };

      onSaveOrder(newOrder);

      const budgetAmount = customer.budget ? Number(customer.budget) : 50000;
      const crmPay: CRMPayment = {
        id: generateId('pay'),
        customer_id: customer.id,
        order_id: orderId,
        total_amount: budgetAmount,
        advance_paid: Math.round(budgetAmount * 0.4),
        balance_due: Math.round(budgetAmount * 0.6),
        payment_method: 'UPI',
        payment_date: new Date().toISOString().split('T')[0],
        pending_amount: Math.round(budgetAmount * 0.6)
      };
      onSaveCRMPayment(crmPay);

      onSaveCRMTimelineEvent({
        id: generateId('evt'),
        customer_id: customer.id,
        type: 'order_created',
        title: 'CRM Order Placed',
        description: `Lead status changed to Order Confirmed. Generated manual workshop order #${articleNo} with budget reference ₹${budgetAmount.toLocaleString('en-IN')}.`,
        timestamp: new Date().toISOString(),
        operator: currentUser.name
      });
    }
  };

  // 1. STATS CALCULATIONS
  const totalCustomers = db.crmCustomers?.length || 0;
  const activeOrders = db.orders?.filter(o => o.current_status !== 'Dispatched').length || 0;
  const completedOrders = db.orders?.filter(o => o.current_status === 'Dispatched').length || 0;
  const pendingQuotes = db.crmQuotations?.filter(q => q.status === 'Sent' || q.status === 'Draft').length || 0;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const followupsToday = db.crmFollowUps?.filter(f => f.date === todayStr && f.status === 'Pending') || [];
  
  // Total Revenue Calculation
  const totalRevenue = db.payments?.reduce((acc, p) => acc + p.advance_paid, 0) || 0;
  
  // Repeat Customers (Customers with > 1 order)
  const customerOrderCounts = db.orders?.reduce((acc: Record<string, number>, o) => {
    acc[o.customer_id] = (acc[o.customer_id] || 0) + 1;
    return acc;
  }, {}) || {};
  
  const repeatCustomersCount = db.crmCustomers?.filter(c => (customerOrderCounts[c.id] || 0) > 1).length || 0;

  // Recent activity logs (Timeline Events across all customers)
  const recentActivities = [...(db.crmTimelineEvents || [])]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  // 2. CHART DATA CONSTRUCTIONS
  // (a) Monthly Orders
  const monthlyOrdersData = [
    { name: 'Jan', orders: 4 },
    { name: 'Feb', orders: 6 },
    { name: 'Mar', orders: 8 },
    { name: 'Apr', orders: db.orders?.filter(o => o.order_date.includes('-04-')).length + 3 || 3 },
    { name: 'May', orders: db.orders?.filter(o => o.order_date.includes('-05-')).length + 5 || 5 },
    { name: 'Jun', orders: db.orders?.filter(o => o.order_date.includes('-06-')).length || 7 },
  ];

  // (b) Revenue Trend (using registered payment dates)
  const revenueTrendData = [
    { name: 'Jan', revenue: 150000 },
    { name: 'Feb', revenue: 220000 },
    { name: 'Mar', revenue: 310000 },
    { name: 'Apr', revenue: 420000 },
    { name: 'May', revenue: totalRevenue > 0 ? Math.round(totalRevenue * 0.7) : 480000 },
    { name: 'Jun', revenue: totalRevenue > 0 ? totalRevenue : 650000 },
  ];

  // (c) Customer Growth
  const customerGrowthData = [
    { name: 'Jan', customers: 5 },
    { name: 'Feb', customers: 11 },
    { name: 'Mar', customers: 18 },
    { name: 'Apr', customers: 24 },
    { name: 'May', customers: totalCustomers > 0 ? Math.round(totalCustomers * 0.8) : 28 },
    { name: 'Jun', customers: totalCustomers > 0 ? totalCustomers : 35 },
  ];

  // (d) Order Status Distribution
  const orderStages = ['Pending', 'Design', 'Carpentry', 'QC Check 1', 'Polish', 'QC Check 2', 'Ready to Dispatch', 'Dispatched'];
  const statusColors = ['#d97706', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#6366f1', '#6b7280'];
  const orderStatusData = orderStages.map(stage => ({
    name: stage,
    value: db.orders?.filter(o => o.current_status === stage).length || 0
  })).filter(item => item.value > 0);

  // 3. ACTION HANDLERS
  const handleAddEditCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasWriteAccess) return;
    const formData = new FormData(e.currentTarget);
    
    const custId = editingCustomer ? editingCustomer.id : `CRM-C-${Math.floor(10000 + Math.random() * 90000)}`;
    const newCust: CRMCustomer = {
      id: custId,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      productRequirement: (formData.get('productRequirement') as string) || undefined,
      address: (formData.get('address') as string) || undefined,
      city: (formData.get('city') as string) || undefined,
      state: (formData.get('state') as string) || undefined,
      pinCode: (formData.get('pinCode') as string) || undefined,
      source: (formData.get('source') as any) || 'Walkin',
      budget: formData.get('budget') ? Number(formData.get('budget')) : undefined,
      timeline: (formData.get('timeline') as string) || undefined,
      status: (formData.get('status') as any) || 'New Inquiry',
      notes: (formData.get('notes') as string) || undefined,
      preferredContactMethod: 'WhatsApp', // safe default fallback
      created_at: editingCustomer ? editingCustomer.created_at : new Date().toISOString(),
      created_by: editingCustomer ? editingCustomer.created_by : currentUser.id,
    };

    onSaveCRMCustomer(newCust);

    // Create a timeline event
    const timelineEvent: CRMTimelineEvent = {
      id: generateId('evt'),
      customer_id: custId,
      type: 'customer_created',
      title: editingCustomer ? 'Customer Updated' : 'Customer Account Registered',
      description: editingCustomer 
        ? `Customer profile parameters synchronized and updated. Source: ${newCust.source}, Budget: ${newCust.budget ? '₹' + newCust.budget : 'Not Specified'}` 
        : `New high-end design lead profile created under ID ${custId}. Source: ${newCust.source}, Budget: ${newCust.budget ? '₹' + newCust.budget : 'Not Specified'}`,
      timestamp: new Date().toISOString(),
      operator: currentUser.name
    };
    onSaveCRMTimelineEvent(timelineEvent);

    if (newCust.status === 'Order Confirmed' && editingCustomer?.status !== 'Order Confirmed') {
      checkAndTriggerOrderCreation(newCust);
    }

    setShowAddCustModal(false);
    setEditingCustomer(null);
    alert(`Success: Customer ${newCust.name} saved successfully!`);
  };

  const handleConvertQuotationToOrder = (quote: CRMQuotation) => {
    if (!hasWriteAccess) return;
    
    // Auto populate custom Order parameters from approved quotation
    const orderId = generateId('order');
    const articleNo = `${new Date().getFullYear().toString().slice(-2)}/${String(new Date().getMonth() + 1).padStart(2, '0')}/QU/${Math.floor(1000 + Math.random() * 9000)}`;
    
    const firstItem = quote.items?.[0];
    const newOrder: Order = {
      id: orderId,
      article_no: articleNo,
      customer_id: quote.customer_id, // Links directly to the CRM customer profile!
      category: 'Living Room', // default fallback
      sub_category: firstItem?.furnitureItem || 'Bespoke Item',
      size: 'Custom',
      custom_size: firstItem?.dimensions || 'Custom Size',
      finish: 'Premium Lacquer Polish',
      special_notes: `Converted from Quotation ${quote.id}. ${quote.notes || ''}`,
      design_type: 'Custom',
      material: firstItem?.material || 'Premium Plywood & Teak Veneer',
      color_shade: 'Teak / Walnut',
      no_of_units: firstItem?.quantity || 1,
      carpenter_id: users.find(u => u.role === 'carpenter')?.id || 'user_rinku_v_prod',
      current_status: 'Pending',
      is_delayed: false,
      priority: 'normal',
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: quote.validUntil,
      portal_token: Math.random().toString(36).substring(2, 10),
      portal_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      qr_token: `https://bhisesworkshop.com/order/${orderId}`,
      created_at: new Date().toISOString(),
      created_by: currentUser.id,
      images: []
    };

    onSaveOrder(newOrder);

    // Create a Payment Ledger record for CRM payment tracking
    const crmPay: CRMPayment = {
      id: generateId('pay'),
      customer_id: quote.customer_id,
      order_id: orderId,
      total_amount: quote.totalAmount,
      advance_paid: Math.round(quote.totalAmount * 0.4), // 40% auto-deposit advance
      balance_due: Math.round(quote.totalAmount * 0.6),
      payment_method: 'UPI',
      payment_date: new Date().toISOString().split('T')[0],
      pending_amount: Math.round(quote.totalAmount * 0.6)
    };
    onSaveCRMPayment(crmPay);

    // Update Customer status in the CRM
    const customer = db.crmCustomers?.find(c => c.id === quote.customer_id);
    if (customer) {
      onSaveCRMCustomer({
        ...customer,
        status: 'Order Confirmed'
      });
    }

    // Update Quotation Status to Approved
    const updatedQuote: CRMQuotation = {
      ...quote,
      status: 'Approved'
    };
    onSaveCRMQuotation(updatedQuote);

    // Add Timeline Event
    const timelineEvent: CRMTimelineEvent = {
      id: generateId('evt'),
      customer_id: quote.customer_id,
      type: 'quotation_approved',
      title: 'Quotation Approved & Order Converted',
      description: `Quotation ${quote.id} approved for total value ₹${(quote.totalAmount ?? 0).toLocaleString('en-IN')}. Custom manufacture order #${articleNo} initialized into production lifecycle.`,
      timestamp: new Date().toISOString(),
      operator: currentUser.name
    };
    onSaveCRMTimelineEvent(timelineEvent);

    alert(`Success! Quotation successfully converted. Production Order #${articleNo} has been queued into Carpentry Stage.`);
  };

  const handleAddManualTimelineEvent = (custId: string, type: 'phone_call' | 'whatsapp_msg' | 'email_sent', details: string) => {
    if (!hasWriteAccess) return;
    const evt: CRMTimelineEvent = {
      id: generateId('evt'),
      customer_id: custId,
      type,
      title: type === 'phone_call' ? 'Phone Call Logged' : type === 'whatsapp_msg' ? 'WhatsApp Chat Logged' : 'Email Interaction Logged',
      description: details,
      timestamp: new Date().toISOString(),
      operator: currentUser.name
    };
    onSaveCRMTimelineEvent(evt);
  };

  const handleAddCustomerNote = (custId: string, noteContent: string) => {
    if (!hasWriteAccess && isArtisan) return;
    const note: CRMNote = {
      id: generateId('nte'),
      customer_id: custId,
      author: `${currentUser.name} (${currentUser.role.toUpperCase()})`,
      timestamp: new Date().toISOString(),
      note: noteContent
    };
    onSaveCRMNote(note);

    // Add Timeline Event
    onSaveCRMTimelineEvent({
      id: generateId('evt'),
      customer_id: custId,
      type: 'note_added',
      title: 'Internal Note Posted',
      description: `New note added: "${noteContent.substring(0, 60)}${noteContent.length > 60 ? '...' : ''}"`,
      timestamp: new Date().toISOString(),
      operator: currentUser.name
    });
  };

  const handleAddAttachment = (custId: string, category: any, fileName: string, url: string) => {
    if (!hasWriteAccess) return;
    const att: CRMAttachment = {
      id: generateId('att'),
      customer_id: custId,
      fileName,
      fileType: url.includes('.pdf') ? 'application/pdf' : 'image/jpeg',
      fileCategory: category,
      url: url || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
      uploaded_at: new Date().toISOString(),
      uploaded_by: currentUser.name
    };
    onSaveCRMAttachment(att);

    // Add Timeline event
    onSaveCRMTimelineEvent({
      id: generateId('evt'),
      customer_id: custId,
      type: 'note_added', // generic interaction log
      title: 'Document Attachment Uploaded',
      description: `Attached ${category}: "${fileName}"`,
      timestamp: new Date().toISOString(),
      operator: currentUser.name
    });
  };

  const handleCreateQuotation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasWriteAccess) return;
    const formData = new FormData(e.currentTarget);
    const custId = formData.get('customerId') as string;
    const customer = db.crmCustomers.find(c => c.id === custId);
    
    const qty = Number(formData.get('quantity') || 1);
    const unitPrice = Number(formData.get('unitPrice') || 0);
    const discountAmount = Number(formData.get('discount') || 0);
    const gstPercent = Number(formData.get('gst') || 0);

    const subTotal = qty * unitPrice;
    const discountedTotal = Math.max(0, subTotal - discountAmount);
    const finalAmount = Math.round(discountedTotal + (discountedTotal * (gstPercent / 100)));

    const item: CRMQuotationItem = {
      id: generateId('item'),
      furnitureItem: formData.get('furnitureItem') as string,
      quantity: qty,
      material: formData.get('material') as string,
      dimensions: formData.get('dimensions') as string,
      unitPrice,
      discount: discountAmount,
      gst: gstPercent,
      totalAmount: finalAmount
    };

    const quoteId = `QT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newQuote: CRMQuotation = {
      id: quoteId,
      customer_id: custId,
      customer_name: customer ? customer.name : 'Unknown Customer',
      items: [item],
      totalAmount: finalAmount,
      validUntil: (formData.get('validUntil') as string) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: (formData.get('notes') as string) || undefined,
      status: 'Sent',
      created_at: new Date().toISOString(),
      created_by: currentUser.name
    };

    onSaveCRMQuotation(newQuote);

    // Add Timeline Event
    onSaveCRMTimelineEvent({
      id: generateId('evt'),
      customer_id: custId,
      type: 'quotation_sent',
      title: 'Quotation Sent to Client',
      description: `Created quotation ${quoteId} for customized "${item.furnitureItem}" valued at ₹${finalAmount.toLocaleString('en-IN')}. Sent with validity until ${newQuote.validUntil}.`,
      timestamp: new Date().toISOString(),
      operator: currentUser.name
    });

    setShowAddQuoteModal(false);
    alert(`Success: Quotation ${quoteId} registered and timeline updated.`);
  };

  const handleCreateFollowup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasWriteAccess) return;
    const formData = new FormData(e.currentTarget);
    const custId = formData.get('customerId') as string;
    const customer = db.crmCustomers.find(c => c.id === custId);

    const flp: CRMFollowUp = {
      id: generateId('flp'),
      customer_id: custId,
      customer_name: customer ? customer.name : 'Unknown Customer',
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      reminder: formData.get('reminder') as string,
      notes: (formData.get('notes') as string) || undefined,
      status: 'Pending',
      created_at: new Date().toISOString(),
      created_by: currentUser.name
    };

    onSaveCRMFollowUp(flp);
    setShowAddFollowupModal(false);
    alert('Success: CRM Follow-up reminder successfully registered.');
  };

  // 4. SEARCHES & FILTERING LOGIC
  const filteredCustomersList = (db.crmCustomers || []).filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
      c.phone.includes(custSearch) ||
      (c.companyName && c.companyName.toLowerCase().includes(custSearch.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(custSearch.toLowerCase())) ||
      c.id.toLowerCase().includes(custSearch.toLowerCase());

    const isRepeat = (customerOrderCounts[c.id] || 0) > 1;
    const ordersForCust = db.orders?.filter(o => o.customer_id === c.id) || [];
    const hasCompletedOrder = ordersForCust.some(o => o.current_status === 'Dispatched');
    const hasActiveOrder = ordersForCust.some(o => o.current_status !== 'Dispatched' && o.current_status !== 'Pending');
    const hasPendingPayment = db.payments?.some(p => ordersForCust.some(o => o.id === p.order_id) && p.balance_due > 0);
    const isVip = ordersForCust.length >= 2 || (db.payments?.filter(p => ordersForCust.some(o => o.id === p.order_id)).reduce((sum, p) => sum + p.total_amount, 0) || 0) > 200000;

    switch (custFilter) {
      case 'active': return matchesSearch && hasActiveOrder;
      case 'repeat': return matchesSearch && isRepeat;
      case 'pending_payment': return matchesSearch && hasPendingPayment;
      case 'completed': return matchesSearch && hasCompletedOrder;
      case 'vip': return matchesSearch && isVip;
      default: return matchesSearch;
    }
  });

  const selectedCustomer = db.crmCustomers?.find(c => c.id === selectedCustomerId);
  const selectedCustOrders = selectedCustomer ? db.orders?.filter(o => o.customer_id === selectedCustomer.id) || [] : [];
  const selectedCustQuotes = selectedCustomer ? db.crmQuotations?.filter(q => q.customer_id === selectedCustomer.id) || [] : [];
  const selectedCustFollowups = selectedCustomer ? db.crmFollowUps?.filter(f => f.customer_id === selectedCustomer.id) || [] : [];
  const selectedCustPayments = selectedCustomer ? db.crmPayments?.filter(p => p.customer_id === selectedCustomer.id) || [] : [];
  const selectedCustNotes = selectedCustomer ? db.crmNotes?.filter(n => n.customer_id === selectedCustomer.id).sort((a,b)=> new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [] : [];
  const selectedCustTimeline = selectedCustomer ? db.crmTimelineEvents?.filter(t => t.customer_id === selectedCustomer.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [] : [];
  const selectedCustAttachments = selectedCustomer ? db.crmAttachments?.filter(a => a.customer_id === selectedCustomer.id) || [] : [];

  return (
    <div className="space-y-6">
      {/* CRM Main Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight flex items-center gap-2">
            <Contact className="text-[#593622]" size={26} /> CRM Module
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            Bespoke woodworks customer relationship dashboard, lead funnels, and quotation converters
          </p>
        </div>

        {/* Navigation tabs */}
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/80 w-full sm:w-auto">
          <button
            onClick={() => { setSubTab('dashboard'); setSelectedCustomerId(null); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'dashboard' ? 'bg-[#593622] text-white shadow' : 'text-stone-600 hover:text-[#593622]'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setSubTab('customers')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'customers' ? 'bg-[#593622] text-white shadow' : 'text-stone-600 hover:text-[#593622]'
            }`}
          >
            Customers Directory
          </button>
          <button
            onClick={() => { setSubTab('quotations'); setSelectedCustomerId(null); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'quotations' ? 'bg-[#593622] text-white shadow' : 'text-stone-600 hover:text-[#593622]'
            }`}
          >
            Quotations
          </button>
          <button
            onClick={() => { setSubTab('followups'); setSelectedCustomerId(null); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'followups' ? 'bg-[#593622] text-white shadow' : 'text-stone-600 hover:text-[#593622]'
            }`}
          >
            Follow-ups
          </button>
        </div>
      </div>

      {/* SUBTAB: DASHBOARD */}
      {subTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top KPI Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 shrink-0">
                <Users size={18} />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Total Customers</span>
                <strong className="text-lg font-black text-stone-900 font-display">{totalCustomers}</strong>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-700 shrink-0">
                <ClipboardList size={18} />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Active/Ready Orders</span>
                <strong className="text-lg font-black text-stone-900 font-display">{activeOrders} / {completedOrders}</strong>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center text-green-700 shrink-0">
                <DollarSign size={18} />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Total Revenue</span>
                <strong className="text-lg font-black text-stone-900 font-display">₹{totalRevenue.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 shrink-0">
                <Award size={18} />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Repeat & VIP Leads</span>
                <strong className="text-lg font-black text-stone-900 font-display">{repeatCustomersCount} VIPs</strong>
              </div>
            </div>
          </div>

          {/* Analytics Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Orders area chart */}
            <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black uppercase text-stone-700 tracking-wider font-display">Monthly Orders Volume</span>
                <TrendingUp className="text-stone-400" size={16} />
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyOrdersData}>
                    <defs>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#593622" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#593622" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} />
                    <YAxis fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="orders" stroke="#593622" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOrders)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue trend line/bar */}
            <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black uppercase text-stone-700 tracking-wider font-display">Revenue Trend (INR)</span>
                <DollarSign className="text-stone-400" size={16} />
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueTrendData}>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} />
                    <YAxis fontSize={10} tickLine={false} />
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Customer growth trend */}
            <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black uppercase text-stone-700 tracking-wider font-display">Customer Growth curve</span>
                <Users className="text-stone-400" size={16} />
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={customerGrowthData}>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} />
                    <YAxis fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="customers" stroke="#059669" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Order status distribution */}
            <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black uppercase text-stone-700 tracking-wider font-display">Production Stage Distribution</span>
                <Activity className="text-stone-400" size={16} />
              </div>
              <div className="h-56 flex items-center justify-between">
                {orderStatusData.length > 0 ? (
                  <>
                    <div className="w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orderStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {orderStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 space-y-1.5 pr-2 max-h-48 overflow-y-auto">
                      {orderStatusData.map((item, idx) => (
                        <div key={item.name} className="flex items-center gap-2 text-[10px] font-bold">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColors[idx % statusColors.length] }} />
                          <span className="text-stone-600 truncate flex-1">{item.name}</span>
                          <span className="text-stone-900 font-mono text-[11px] font-bold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="w-full text-center py-10 text-stone-400 text-xs font-medium">
                    No active production orders recorded.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Today's Follow-ups and Recent Activity timeline split row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Follow-ups Due today */}
            <div className="lg:col-span-5 bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                <h4 className="text-xs font-black text-[#593622] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} /> Follow-ups Due Today
                </h4>
                <span className="bg-[#593622]/10 text-[#593622] px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
                  {followupsToday.length} Pending
                </span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {followupsToday.length > 0 ? (
                  followupsToday.map(f => (
                    <div key={f.id} className="bg-white border border-stone-200/80 p-3 rounded-xl shadow-xs space-y-1.5 relative hover:border-stone-400 transition">
                      <div className="flex justify-between items-start gap-2">
                        <strong className="text-xs text-stone-900 font-bold block">{f.customer_name}</strong>
                        <span className="text-[10px] font-bold font-mono text-[#d97706] bg-amber-50 px-1.5 py-0.5 rounded">
                          {f.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 italic leading-snug">"{f.reminder}"</p>
                      <div className="flex justify-between items-center pt-1 border-t border-stone-100 text-[10px]">
                        <span className="text-stone-400">Scheduled: {f.created_by}</span>
                        <button
                          onClick={() => {
                            const updated = { ...f, status: 'Completed' as const };
                            onSaveCRMFollowUp(updated);
                            alert('Follow-up marked complete!');
                          }}
                          className="text-[#059669] hover:underline font-bold"
                        >
                          Mark Completed
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 space-y-2">
                    <CheckCircle className="text-emerald-500 mx-auto" size={24} />
                    <p className="text-xs text-stone-400 font-bold">Excellent: All clear!</p>
                    <p className="text-[10px] text-stone-400">No follow-ups remain pending for today.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Recent global customer activities timeline */}
            <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-4 space-y-4">
              <div className="border-b border-stone-200 pb-2">
                <h4 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-[#593622]" /> Recent CRM Activity Timeline
                </h4>
              </div>

              <div className="relative pl-3 space-y-4 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {/* Vertical Timeline Bar */}
                <div className="absolute left-[7px] top-2 bottom-2 w-[1.5px] bg-stone-200" />

                {recentActivities.length > 0 ? (
                  recentActivities.map(act => (
                    <div key={act.id} className="relative pl-5 space-y-1">
                      {/* Timeline Dot Indicator */}
                      <div className="absolute -left-[1.5px] top-1 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-white ring-1 ring-stone-200" />
                      
                      <div className="flex justify-between items-center gap-2">
                        <strong className="text-xs text-stone-900 block font-bold leading-tight">{act.title}</strong>
                        <span className="text-[9px] font-mono text-stone-400">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600">{act.description}</p>
                      <div className="text-[9px] text-stone-400 font-mono uppercase tracking-wider">
                        BY {act.operator} | STAMP: {new Date(act.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-14">
                    <p className="text-xs text-stone-400 font-bold">Timeline is currently empty.</p>
                    <p className="text-[10px] text-stone-400">Log customer contacts, quotes or logs to trigger activities.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: CUSTOMERS DIRECTORY */}
      {subTab === 'customers' && (
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {!selectedCustomerId ? (
              // Main Directory List
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Filtering controls bar */}
                <div className="bg-white border border-stone-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shadow-xs">
                  <div className="flex flex-1 gap-2 flex-wrap items-center">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-3 text-stone-400" size={14} />
                      <input
                        type="text"
                        value={custSearch}
                        onChange={(e) => setCustSearch(e.target.value)}
                        placeholder="Search by name, company, city, mobile..."
                        className="w-full pl-9 pr-4 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-[#593622] transition"
                      />
                    </div>

                    <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 gap-1 text-[10px] font-bold">
                      {['all', 'active', 'repeat', 'pending_payment', 'completed', 'vip'].map(filterOption => (
                        <button
                          key={filterOption}
                          onClick={() => setCustFilter(filterOption as any)}
                          className={`px-2 py-1 rounded-md capitalize transition ${
                            custFilter === filterOption ? 'bg-[#593622] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          {filterOption.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
                      <button
                        onClick={() => setCustViewMode('grid')}
                        className={`p-1 rounded-lg ${custViewMode === 'grid' ? 'bg-white text-[#593622]' : 'text-stone-400'}`}
                      >
                        <Grid size={15} />
                      </button>
                      <button
                        onClick={() => setCustViewMode('table')}
                        className={`p-1 rounded-lg ${custViewMode === 'table' ? 'bg-white text-[#593622]' : 'text-stone-400'}`}
                      >
                        <List size={15} />
                      </button>
                    </div>

                    {hasWriteAccess && (
                      <button
                        onClick={() => { setEditingCustomer(null); setShowAddCustModal(true); }}
                        className="bg-[#593622] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-[#4d2f1e] cursor-pointer"
                      >
                        <UserPlus size={14} /> Add Customer
                      </button>
                    )}
                  </div>
                </div>

                {/* Main listings view rendering */}
                {filteredCustomersList.length > 0 ? (
                  custViewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredCustomersList.map(cust => {
                        const totalOrders = db.orders?.filter(o => o.customer_id === cust.id).length || 0;
                        const paymentsForCust = db.payments?.filter(p => db.orders?.some(o => o.id === p.order_id && o.customer_id === cust.id)) || [];
                        const unpaidAmount = paymentsForCust.reduce((acc, p) => acc + p.balance_due, 0);
                        const displayStatus = getCustomerStatus(cust);
                        
                        return (
                          <div
                            key={cust.id}
                            onClick={() => setSelectedCustomerId(cust.id)}
                            className="bg-white border border-stone-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-md hover:border-stone-400 transition duration-150 cursor-pointer group"
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <span className="text-[9px] font-mono text-stone-400 uppercase font-black">{cust.id}</span>
                                  <h3 className="text-sm font-black text-stone-900 group-hover:text-[#593622] transition leading-snug">
                                    {cust.name}
                                  </h3>
                                  {cust.productRequirement && (
                                    <span className="text-[11px] font-medium text-stone-600 flex items-center gap-1 mt-0.5 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-150">
                                      📦 {cust.productRequirement}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {cust.timeline && (
                                    <span className="bg-[#593622]/5 text-[#593622] px-2 py-0.5 rounded-full text-[9px] font-bold">
                                      ⏳ {cust.timeline}
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-tight ${getStatusBadgeColor(displayStatus)}`}>
                                    {getStatusLabelWithEmoji(displayStatus)}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold py-1 bg-stone-50 rounded-lg px-2 border border-stone-100">
                                <div>
                                  <span className="text-stone-400 text-[8px] block uppercase font-black">Source</span>
                                  <span className="text-stone-850 capitalize">{cust.source || 'walkin'}</span>
                                </div>
                                <div>
                                  <span className="text-stone-400 text-[8px] block uppercase font-black">Budget</span>
                                  <span className="text-stone-900 font-mono">{cust.budget ? `₹${Number(cust.budget).toLocaleString('en-IN')}` : 'Not set'}</span>
                                </div>
                              </div>

                              <div className="space-y-1.5 border-t border-stone-100 pt-3 text-[11px] text-stone-600">
                                <p className="flex items-center gap-2 font-mono">
                                  <Phone size={12} className="text-stone-400 shrink-0" /> {cust.phone}
                                </p>
                                {cust.email && (
                                  <p className="flex items-center gap-2 truncate">
                                    <Mail size={12} className="text-stone-400 shrink-0" /> {cust.email}
                                  </p>
                                )}
                                {cust.city && (
                                  <p className="flex items-center gap-2">
                                    <MapPin size={12} className="text-stone-400 shrink-0" /> {cust.city}, {cust.state || ''}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-stone-100 pt-3 mt-4 text-[10px] font-bold">
                              <div className="flex gap-2">
                                <span className="bg-[#593622]/10 text-[#593622] px-2 py-0.5 rounded-md font-mono">
                                  {totalOrders} {totalOrders === 1 ? 'order' : 'orders'}
                                </span>
                                {unpaidAmount > 0 && (
                                  <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md font-mono">
                                    Unpaid ₹{unpaidAmount.toLocaleString()}
                                  </span>
                                )}
                              </div>

                              <span className="text-stone-400 group-hover:text-[#593622] flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider transition">
                                Profile <ChevronRight size={12} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Table View
                    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-stone-50 border-b border-stone-200 text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                            <tr>
                              <th className="p-4">Customer ID</th>
                              <th className="p-4">Full Name</th>
                              <th className="p-4">Journey Status</th>
                              <th className="p-4">Source</th>
                              <th className="p-4">Budget</th>
                              <th className="p-4">Company</th>
                              <th className="p-4">Mobile Number</th>
                              <th className="p-4">Location</th>
                              <th className="p-4">Preferred Reach</th>
                              <th className="p-4">Orders Count</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                            {filteredCustomersList.map(cust => {
                              const displayStatus = getCustomerStatus(cust);
                              return (
                                <tr
                                  key={cust.id}
                                  className="hover:bg-stone-50/80 cursor-pointer transition"
                                  onClick={() => setSelectedCustomerId(cust.id)}
                                >
                                  <td className="p-4 font-mono text-[10px] text-stone-400 uppercase font-black">{cust.id}</td>
                                  <td className="p-4 text-stone-900 font-bold">{cust.name}</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${getStatusBadgeColor(displayStatus)}`}>
                                      {getStatusLabelWithEmoji(displayStatus)}
                                    </span>
                                  </td>
                                  <td className="p-4 capitalize">
                                    <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md text-[9px] font-bold">
                                      {cust.source || 'walkin'}
                                    </span>
                                  </td>
                                  <td className="p-4 font-mono font-bold text-stone-900">
                                    {cust.budget ? `₹${Number(cust.budget).toLocaleString('en-IN')}` : '-'}
                                  </td>
                                  <td className="p-4 text-stone-500">{cust.companyName || '-'}</td>
                                  <td className="p-4 font-mono">{cust.phone}</td>
                                  <td className="p-4">{cust.city ? `${cust.city}, ${cust.state || ''}` : '-'}</td>
                                  <td className="p-4">
                                    <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                                      {cust.preferredContactMethod}
                                    </span>
                                  </td>
                                  <td className="p-4 font-mono">
                                    {db.orders?.filter(o => o.customer_id === cust.id).length || 0}
                                  </td>
                                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => setSelectedCustomerId(cust.id)}
                                        className="text-stone-500 hover:text-[#593622]"
                                      >
                                        <Eye size={14} />
                                      </button>
                                      {hasWriteAccess && (
                                        <>
                                          <button
                                            onClick={() => { setEditingCustomer(cust); setShowAddCustModal(true); }}
                                            className="text-amber-600 hover:text-amber-800"
                                          >
                                            <Edit size={14} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (window.confirm(`Are you sure you want to delete customer ${cust.name}? This is irreversible.`)) {
                                                onDeleteCRMCustomer(cust.id);
                                              }
                                            }}
                                            className="text-rose-500 hover:text-rose-700"
                                          >
                                            <Trash2 size={14} />
                                          </button>
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
                    </div>
                  )
                ) : (
                  <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-3">
                    <Users size={32} className="mx-auto text-stone-300" />
                    <p className="text-stone-500 font-bold text-xs">No registered customer leads matched filters.</p>
                    {hasWriteAccess && (
                      <button
                        onClick={() => { setEditingCustomer(null); setShowAddCustModal(true); }}
                        className="bg-[#593622] text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow"
                      >
                        <UserPlus size={14} /> Registered First Customer
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              // ---------------- CUSTOMER PROFILE VIEW ----------------
              selectedCustomer && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Profile Header Block */}
                  <div className="bg-stone-900 text-stone-100 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                    {/* Background visual detail */}
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[#593622]/10 blur-xl pointer-events-none rounded-full" />
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <button
                        onClick={() => setSelectedCustomerId(null)}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition cursor-pointer"
                      >
                        <X size={15} />
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-mono text-stone-400 font-bold uppercase tracking-wider">{selectedCustomer.id}</span>
                          {selectedCustomer.timeline && (
                            <span className="bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">
                              Timeline: {selectedCustomer.timeline}
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl font-black font-display tracking-tight text-white mt-1">
                          {selectedCustomer.name}
                        </h2>
                        {selectedCustomer.productRequirement && (
                          <p className="text-[11px] text-stone-300 mt-1 flex items-center gap-1.5">
                            <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-semibold text-stone-200">
                              Requirement: {selectedCustomer.productRequirement}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2.5 relative z-10 flex-wrap w-full md:w-auto">
                      {hasWriteAccess && (
                        <>
                          <button
                            onClick={() => { setEditingCustomer(selectedCustomer); setShowAddCustModal(true); }}
                            className="flex-1 md:flex-initial bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <Edit size={13} /> Edit Profile
                          </button>
                          <button
                            onClick={() => setShowAddQuoteModal(true)}
                            className="flex-1 md:flex-initial bg-amber-500 hover:bg-amber-600 text-stone-950 px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow"
                          >
                            <FileText size={13} /> Generate Quote
                          </button>
                          <button
                            onClick={() => setShowAddFollowupModal(true)}
                            className="flex-1 md:flex-initial bg-[#593622] hover:bg-[#4a2d1d] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <Calendar size={13} /> Schedule Call
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Customer personal metadata metrics */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Personal info detail box */}
                    <div className="lg:col-span-4 bg-white border border-stone-200 p-5 rounded-2xl space-y-4 shadow-xs">
                      <span className="text-[10px] font-black uppercase text-[#593622] tracking-wider block font-display">
                        Client Contact Details
                      </span>

                      <div className="space-y-3 font-medium text-stone-700 text-xs">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase text-stone-400 font-bold block">Contact Number</span>
                          <p className="font-mono text-stone-900 font-bold flex items-center gap-1.5">
                            <Phone size={13} className="text-stone-400" /> {selectedCustomer.phone}
                          </p>
                        </div>

                        {(selectedCustomer.address || selectedCustomer.city) && (
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase text-stone-400 font-bold block">Location (Address)</span>
                            <p className="text-stone-900 font-semibold flex items-start gap-1.5 leading-snug">
                              <MapPin size={13} className="text-stone-400 shrink-0 mt-0.5" />
                              <span>
                                {selectedCustomer.address ? `${selectedCustomer.address}, ` : ''}
                                {selectedCustomer.city || ''} {selectedCustomer.state ? `, ${selectedCustomer.state}` : ''}
                                {selectedCustomer.pinCode ? ` - ${selectedCustomer.pinCode}` : ''}
                              </span>
                            </p>
                          </div>
                        )}

                        <div className="border-t border-stone-100 pt-3 text-[10px] text-stone-400 font-bold font-mono">
                          RECORD CREATED: {new Date(selectedCustomer.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="border-t border-stone-100 pt-4 space-y-3">
                        <span className="text-[10px] font-black uppercase text-[#593622] tracking-wider block font-display">
                          Journey & Budget Status
                        </span>

                        <div className="space-y-3 font-medium text-stone-700 text-xs">
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase text-stone-400 font-bold block">Customer Journey Stage</span>
                            <select
                              value={getCustomerStatus(selectedCustomer)}
                              onChange={(e) => {
                                const newStatus = e.target.value as any;
                                const updatedCust = { ...selectedCustomer, status: newStatus };
                                onSaveCRMCustomer(updatedCust);
                                
                                onSaveCRMTimelineEvent({
                                  id: generateId('evt'),
                                  customer_id: selectedCustomer.id,
                                  type: 'status_change',
                                  title: 'Lead Status Transitioned',
                                  description: `Customer journey stage manually set to ${getStatusLabelWithEmoji(newStatus)}.`,
                                  timestamp: new Date().toISOString(),
                                  operator: currentUser.name
                                });

                                if (newStatus === 'Order Confirmed' && selectedCustomer.status !== 'Order Confirmed') {
                                  checkAndTriggerOrderCreation(updatedCust);
                                }
                              }}
                              disabled={!hasWriteAccess || getCustomerStatus(selectedCustomer) === 'In Production'}
                              className={`w-full text-xs font-bold rounded-xl px-3 py-2 focus:outline-none border cursor-pointer ${getStatusBadgeColor(getCustomerStatus(selectedCustomer))}`}
                            >
                              <option value="New Inquiry">🟥 New Inquiry</option>
                              <option value="Quotation Pending">🟨 Quotation Pending</option>
                              <option value="Quotation Sent">🟦 Quotation Sent</option>
                              <option value="Follow-up">🟪 Follow-up</option>
                              <option value="Order Confirmed">🟩 Order Confirmed</option>
                              <option value="In Production" disabled={getCustomerStatus(selectedCustomer) !== 'In Production'}>🏭 In Production {getCustomerStatus(selectedCustomer) === 'In Production' ? '(Synced)' : '(Auto)'}</option>
                              <option value="Delivered">🟫 Delivered</option>
                              <option value="Cancelled">⚫ Cancelled</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] uppercase text-stone-400 font-bold block">Lead Source</span>
                            <p className="font-bold text-stone-900 capitalize flex items-center gap-1.5 mt-0.5">
                              <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-0.5 rounded-full border border-amber-200">
                                {selectedCustomer.source || 'walkin'}
                              </span>
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] uppercase text-stone-400 font-bold block">Estimated Budget</span>
                            <p className="font-mono font-bold text-stone-900 text-sm mt-0.5">
                              {selectedCustomer.budget ? `₹${Number(selectedCustomer.budget).toLocaleString('en-IN')}` : 'Not Specified'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Manual Quick Timeline Log actions */}
                      {hasWriteAccess && (
                        <div className="border-t border-stone-200 pt-4 space-y-2">
                          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block font-display">
                            Manual Interactions Log
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              onClick={() => {
                                const notes = window.prompt("Enter Phone Call notes / outcome:");
                                if (notes) handleAddManualTimelineEvent(selectedCustomer.id, 'phone_call', notes);
                              }}
                              className="bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 py-1 rounded text-[9px] font-bold transition flex flex-col items-center gap-1"
                            >
                              <Phone size={12} className="text-[#593622]" /> Call
                            </button>
                            <button
                              onClick={() => {
                                const notes = window.prompt("Enter WhatsApp details / chat notes:");
                                if (notes) handleAddManualTimelineEvent(selectedCustomer.id, 'whatsapp_msg', notes);
                              }}
                              className="bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 py-1 rounded text-[9px] font-bold transition flex flex-col items-center gap-1"
                            >
                              <MessageSquare size={12} className="text-emerald-600" /> WhatsApp
                            </button>
                            <button
                              onClick={() => {
                                const notes = window.prompt("Enter Email Sent Subject / Purpose:");
                                if (notes) handleAddManualTimelineEvent(selectedCustomer.id, 'email_sent', notes);
                              }}
                              className="bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 py-1 rounded text-[9px] font-bold transition flex flex-col items-center gap-1"
                            >
                              <Mail size={12} className="text-blue-500" /> Email
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Dynamic sub-tabs for historical logs */}
                    <div className="lg:col-span-8 space-y-6">
                      {/* Active payments progress bar if there's orders */}
                      <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-xs space-y-4">
                        <span className="text-[10px] font-black uppercase text-[#593622] tracking-wider block font-display">
                          Account Financial Progress
                        </span>

                        {selectedCustPayments.length > 0 ? (
                          selectedCustPayments.map(pay => {
                            const advPaid = pay.advance_paid ?? 0;
                            const totAmt = pay.total_amount ?? 1;
                            const balDue = pay.balance_due ?? 0;
                            const pct = Math.round((advPaid / totAmt) * 100);
                            return (
                              <div key={pay.id} className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                  <div>
                                    <strong className="text-stone-900 font-bold block">Quoted Manufacturing Volume</strong>
                                    <span className="text-[10px] font-mono text-stone-400">Order Ref: {pay.order_id || 'Not assigned'}</span>
                                  </div>
                                  <span className="text-emerald-600 font-mono font-bold text-sm">
                                    ₹{advPaid.toLocaleString('en-IN')} / ₹{(pay.total_amount ?? 0).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200 flex">
                                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${pct}%` }} />
                                </div>

                                <div className="flex justify-between items-center text-[10px] font-mono font-bold text-stone-400">
                                  <span>{pct}% Collected Advance</span>
                                  <span className="text-rose-500">₹{balDue.toLocaleString('en-IN')} Balance due</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-stone-400 font-medium">No recorded transactions or advance ledger mappings for this customer yet.</p>
                        )}
                      </div>

                      {/* Main client data split panels */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Production Orders History */}
                        <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl space-y-3">
                          <span className="text-[10px] font-black uppercase text-stone-600 tracking-wider block">
                            Active Production Orders ({selectedCustOrders.length})
                          </span>

                          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                            {selectedCustOrders.length > 0 ? (
                              selectedCustOrders.map(o => (
                                <div key={o.id} className="bg-white border border-stone-200 p-3 rounded-xl flex items-center justify-between shadow-xs hover:border-stone-400 transition">
                                  <div>
                                    <strong className="text-xs text-stone-950 font-bold block">{o.article_no}</strong>
                                    <span className="text-[10px] text-stone-500">{o.sub_category} | Qty: {o.no_of_units}</span>
                                  </div>
                                  <span className="bg-[#593622]/10 text-[#593622] px-2 py-0.5 rounded text-[9px] font-mono font-bold">
                                    {o.current_status}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-stone-400 text-center py-6">No production orders logged.</p>
                            )}
                          </div>
                        </div>

                        {/* 2. Quotation History */}
                        <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl space-y-3">
                          <span className="text-[10px] font-black uppercase text-stone-600 tracking-wider block">
                            Quotations Generated ({selectedCustQuotes.length})
                          </span>

                          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                            {selectedCustQuotes.length > 0 ? (
                              selectedCustQuotes.map(q => (
                                <div key={q.id} className="bg-white border border-stone-200 p-3 rounded-xl flex items-center justify-between shadow-xs">
                                  <div>
                                    <strong className="text-xs text-stone-950 font-bold block">{q.id}</strong>
                                    <span className="text-[10px] text-stone-500">₹{(q.totalAmount ?? 0).toLocaleString('en-IN')} | Valid: {q.validUntil}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      q.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {q.status}
                                    </span>
                                    {q.status === 'Sent' && hasWriteAccess && (
                                      <button
                                        onClick={() => handleConvertQuotationToOrder(q)}
                                        className="bg-[#593622] hover:bg-[#4d2f1e] text-white p-1 rounded transition"
                                        title="Convert to Order"
                                      >
                                        <FileCheck size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-stone-400 text-center py-6">No price quotes generated.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Attachments Section */}
                      <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-xs space-y-4">
                        <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                          <span className="text-[10px] font-black uppercase text-[#593622] tracking-wider block font-display">
                            CAD Drawings & Design Blueprint Attachments ({selectedCustAttachments.length})
                          </span>
                          
                          {hasWriteAccess && (
                            <button
                              onClick={() => {
                                setAttachCategory("Design Image");
                                setAttachFileName("");
                                setCapturedImage(null);
                                setUploadedFileData(null);
                                setShowAttachmentModal(true);
                              }}
                              className="text-xs text-[#593622] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={13} /> Attach File / Photo
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedCustAttachments.length > 0 ? (
                            selectedCustAttachments.map(att => (
                              <div key={att.id} className="bg-stone-50 border border-stone-200 p-3 rounded-xl flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="h-9 w-9 bg-amber-100 rounded-lg flex items-center justify-center text-[#593622] shrink-0">
                                    <FileSpreadsheet size={16} />
                                  </div>
                                  <div className="min-w-0">
                                    <strong className="text-xs text-stone-900 block truncate font-bold">{att.fileName}</strong>
                                    <span className="text-[10px] text-stone-400 font-mono block uppercase tracking-wider">{att.fileCategory}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-white hover:bg-stone-100 border border-stone-200 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 transition"
                                    title="Open link"
                                  >
                                    <Link size={12} />
                                  </a>
                                  {hasWriteAccess && (
                                    <button
                                      onClick={() => onDeleteCRMAttachment(att.id)}
                                      className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-stone-400 font-medium py-3 col-span-2">No custom references, contracts, or blueprint attachments uploaded.</p>
                          )}
                        </div>
                      </div>

                      {/* Notes & Timeline Chronology */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left: Customer Notes */}
                        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-xs space-y-3">
                          <span className="text-[10px] font-black uppercase text-[#593622] tracking-wider block font-display">
                            Internal Staff Notes ({selectedCustNotes.length})
                          </span>

                          {/* Quick note submission form */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const form = e.currentTarget;
                              const note = new FormData(form).get('new_note') as string;
                              if (note) {
                                handleAddCustomerNote(selectedCustomer.id, note);
                                form.reset();
                              }
                            }}
                            className="flex gap-2"
                          >
                            <input
                              type="text"
                              name="new_note"
                              placeholder="Post internal note/update..."
                              className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#593622]"
                            />
                            <button
                              type="submit"
                              className="bg-[#593622] hover:bg-[#4d2f1e] text-white px-3 rounded-lg text-xs font-bold shrink-0 transition"
                            >
                              Post
                            </button>
                          </form>

                          <div className="space-y-3 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                            {selectedCustNotes.length > 0 ? (
                              selectedCustNotes.map(n => (
                                <div key={n.id} className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/60 relative group">
                                  <p className="text-xs text-stone-800 leading-snug">{n.note}</p>
                                  <div className="flex justify-between items-center text-[9px] text-stone-400 font-mono mt-2 font-bold uppercase">
                                    <span>{n.author}</span>
                                    <span>{new Date(n.timestamp).toLocaleDateString()}</span>
                                  </div>
                                  {hasWriteAccess && (
                                    <button
                                      onClick={() => onDeleteCRMNote(n.id)}
                                      className="absolute top-1.5 right-1.5 text-stone-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition duration-150"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-stone-400 text-center py-6">No notes recorded yet.</p>
                            )}
                          </div>
                        </div>

                        {/* Right: Timeline */}
                        <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl shadow-xs space-y-3">
                          <span className="text-[10px] font-black uppercase text-stone-600 tracking-wider block">
                            Communication Timeline Log ({selectedCustTimeline.length})
                          </span>

                          <div className="relative pl-3 space-y-3.5 max-h-64 overflow-y-auto pr-1 no-scrollbar text-xs">
                            <div className="absolute left-[7px] top-1.5 bottom-1.5 w-[1px] bg-stone-300" />

                            {selectedCustTimeline.length > 0 ? (
                              selectedCustTimeline.map(evt => (
                                <div key={evt.id} className="relative pl-4 space-y-0.5">
                                  <div className="absolute -left-[1.5px] top-1 h-2 w-2 rounded-full bg-[#593622] border border-white" />
                                  <strong className="text-stone-900 block font-bold leading-tight">{evt.title}</strong>
                                  <p className="text-stone-600 text-[11px] leading-snug">{evt.description}</p>
                                  <span className="text-[9px] text-stone-400 font-mono block">
                                    {new Date(evt.timestamp).toLocaleDateString()} | BY: {evt.operator}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-stone-400 text-center py-8">Timeline is currently empty.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      )}

      {/* SUBTAB: QUOTATIONS */}
      {subTab === 'quotations' && (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 p-4 rounded-2xl flex justify-between items-center shadow-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block font-display">Active Lead Pool</span>
              <h2 className="text-base font-black text-stone-900 leading-tight">Price Quotations Ledgers</h2>
            </div>

            {hasWriteAccess && (
              <button
                onClick={() => setShowAddQuoteModal(true)}
                className="bg-[#593622] hover:bg-[#4d2f1e] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus size={14} /> New Quotation
              </button>
            )}
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Quotation ID</th>
                    <th className="p-4">Customer Lead</th>
                    <th className="p-4">Furniture Scope</th>
                    <th className="p-4">Valid Until</th>
                    <th className="p-4">Material Specified</th>
                    <th className="p-4">Estimated Value</th>
                    <th className="p-4">Current Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {db.crmQuotations && db.crmQuotations.length > 0 ? (
                    db.crmQuotations.map(quote => {
                      const firstItem = quote.items?.[0];
                      return (
                        <tr key={quote.id} className="hover:bg-stone-50/50 transition">
                          <td className="p-4 font-mono font-bold text-[#593622]">{quote.id}</td>
                          <td className="p-4 text-stone-900 font-bold">{quote.customer_name}</td>
                          <td className="p-4">{firstItem?.furnitureItem || 'Custom scope'}</td>
                          <td className="p-4 font-mono">{quote.validUntil}</td>
                          <td className="p-4 text-stone-500 text-[11px]">{firstItem?.material || '-'}</td>
                          <td className="p-4 font-mono font-bold text-stone-950">₹{(quote.totalAmount ?? 0).toLocaleString('en-IN')}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              quote.status === 'Approved' ? 'bg-green-100 text-green-700' :
                              quote.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                              quote.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                              'bg-stone-100 text-stone-700'
                            }`}>
                              {quote.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {quote.status === 'Sent' && hasWriteAccess && (
                                <>
                                  <button
                                    onClick={() => handleConvertQuotationToOrder(quote)}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded-lg transition"
                                    title="Approve & Convert to Production Order"
                                  >
                                    <FileCheck size={13} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const updated = { ...quote, status: 'Rejected' as const };
                                      onSaveCRMQuotation(updated);
                                      alert('Quotation marked Rejected.');
                                    }}
                                    className="bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-lg transition"
                                    title="Mark Rejected"
                                  >
                                    <XCircle size={13} />
                                  </button>
                                </>
                              )}
                              {hasWriteAccess && (
                                <button
                                  onClick={() => {
                                    if (window.confirm('Delete this quotation permanently?')) {
                                      onDeleteCRMQuotation(quote.id);
                                    }
                                  }}
                                  className="text-stone-400 hover:text-rose-500 p-1 rounded transition"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-stone-400 font-medium">
                        No quotations drafted. Click "New Quotation" to generate lead proposals.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: FOLLOW-UPS */}
      {subTab === 'followups' && (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 p-4 rounded-2xl flex justify-between items-center shadow-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block font-display">Schedules Planner</span>
              <h2 className="text-base font-black text-stone-900 leading-tight">Customer Follow-up Planner</h2>
            </div>

            {hasWriteAccess && (
              <button
                onClick={() => setShowAddFollowupModal(true)}
                className="bg-[#593622] hover:bg-[#4d2f1e] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus size={14} /> Schedule Follow-up
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {db.crmFollowUps && db.crmFollowUps.length > 0 ? (
              db.crmFollowUps.map(f => (
                <div
                  key={f.id}
                  className={`bg-white border p-4 rounded-2xl shadow-xs relative hover:border-stone-400 transition flex flex-col justify-between ${
                    f.status === 'Completed' ? 'opacity-65 bg-stone-50/50' : 'border-stone-200'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider">{f.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        f.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {f.status}
                      </span>
                    </div>

                    <div>
                      <strong className="text-sm font-black text-stone-900 block">{f.customer_name}</strong>
                      <p className="text-[11px] text-stone-600 leading-relaxed italic mt-1">"{f.reminder}"</p>
                    </div>

                    <div className="space-y-1 pt-2.5 border-t border-stone-100 text-[11px] text-stone-500 font-medium">
                      <p className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-stone-400" /> Date: <span className="text-stone-800 font-mono font-bold">{f.date}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Clock size={12} className="text-stone-400" /> Time: <span className="text-stone-800 font-mono font-bold">{f.time}</span>
                      </p>
                      {f.notes && (
                        <p className="text-[10px] text-stone-400 mt-1">Notes: {f.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-stone-100 pt-3 mt-4 text-[11px] font-bold">
                    <span className="text-[9px] text-stone-400">Scheduled by {f.created_by}</span>
                    <div className="flex gap-2">
                      {f.status === 'Pending' && hasWriteAccess && (
                        <button
                          onClick={() => {
                            const updated = { ...f, status: 'Completed' as const };
                            onSaveCRMFollowUp(updated);
                            alert('Follow-up successfully logged as Completed.');
                          }}
                          className="text-emerald-600 hover:underline text-[10px] font-bold cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      )}
                      {hasWriteAccess && (
                        <button
                          onClick={() => onDeleteCRMFollowUp(f.id)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center col-span-3 space-y-2.5">
                <Calendar size={28} className="text-stone-300 mx-auto" />
                <p className="text-stone-500 text-xs font-bold">No follow-ups recorded.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------- DIALOG MODALS -------------------- */}
      
      {/* 1. ADD / EDIT CUSTOMER MODAL */}
      {showAddCustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-[#593622] font-display uppercase tracking-tight">
                {editingCustomer ? 'Edit Customer Profile' : 'Add New CRM Lead Customer'}
              </h3>
              <button onClick={() => { setShowAddCustModal(false); setEditingCustomer(null); }} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEditCustomer} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-600">Full Name *</label>
                <input
                  required
                  type="text"
                  name="name"
                  defaultValue={editingCustomer?.name || ''}
                  placeholder="e.g. Sagar Ghodke"
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Contact Number *</label>
                <input
                  required
                  type="tel"
                  name="phone"
                  defaultValue={editingCustomer?.phone || ''}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Product Requirement *</label>
                <input
                  required
                  type="text"
                  name="productRequirement"
                  defaultValue={editingCustomer?.productRequirement || ''}
                  placeholder="e.g. 6-Seater Solid Teak wood dining table"
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Location (Address details)</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={editingCustomer?.address || ''}
                  placeholder="e.g. Flat 301, Woodside Avenue, Sector 5"
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-650">City</label>
                  <input
                    type="text"
                    name="city"
                    defaultValue={editingCustomer?.city || ''}
                    placeholder="Mumbai"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-655">State</label>
                  <input
                    type="text"
                    name="state"
                    defaultValue={editingCustomer?.state || ''}
                    placeholder="MH"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-660">PIN Code</label>
                  <input
                    type="text"
                    name="pinCode"
                    defaultValue={editingCustomer?.pinCode || ''}
                    placeholder="400001"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Source *</label>
                <select
                  name="source"
                  defaultValue={editingCustomer?.source || 'Walkin'}
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-bold"
                >
                  <option value="Website">Website</option>
                  <option value="Walkin">Walkin</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Youtube">Youtube</option>
                  <option value="Reference">Reference</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Project Budget (INR)</label>
                <input
                  type="number"
                  name="budget"
                  defaultValue={editingCustomer?.budget || ''}
                  placeholder="e.g. 150000"
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Time line</label>
                <input
                  type="text"
                  name="timeline"
                  defaultValue={editingCustomer?.timeline || ''}
                  placeholder="e.g. 3-4 weeks"
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Journey Status Stage *</label>
                <select
                  name="status"
                  defaultValue={editingCustomer?.status || 'New Inquiry'}
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-bold"
                >
                  <option value="New Inquiry">New Inquiry</option>
                  <option value="Quotation Pending">Quotation Pending</option>
                  <option value="Quotation Sent">Quotation Sent</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Order Confirmed">Order Confirmed</option>
                  <option value="In Production">In Production</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Initial Project Scope Notes</label>
                <textarea
                  name="notes"
                  defaultValue={editingCustomer?.notes || ''}
                  placeholder="e.g. Customer looking for solid teak wood dining table with lacquer finish..."
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none h-16"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#593622] hover:bg-[#4d2f1e] text-white py-2.5 rounded-xl font-bold transition shadow-md text-xs mt-3 cursor-pointer animate-none"
              >
                Save Customer Lead
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 2. GENERATE QUOTATION MODAL */}
      {showAddQuoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-[#593622] font-display uppercase tracking-tight">
                Generate Custom Price Quotation
              </h3>
              <button onClick={() => setShowAddQuoteModal(false)} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-600">Select Customer Lead *</label>
                <select
                  required
                  name="customerId"
                  defaultValue={selectedCustomerId || ''}
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-bold"
                >
                  <option value="" disabled>-- Select Customer --</option>
                  {db.crmCustomers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Item name *</label>
                <input
                  required
                  type="text"
                  name="furnitureItem"
                  placeholder="e.g. 6-Seater Teakwood Dining Table"
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-600">Premium Wood / Material</label>
                  <input
                    type="text"
                    name="material"
                    placeholder="e.g. Solid Teak wood & Matte Lacquer"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-600">Dimensions Spec</label>
                  <input
                    type="text"
                    name="dimensions"
                    placeholder="e.g. 72L x 36W x 30H inches"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-stone-600">Quantity *</label>
                  <input
                    required
                    type="number"
                    name="quantity"
                    min="1"
                    defaultValue="1"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-600">Unit Cost (INR) *</label>
                  <input
                    required
                    type="number"
                    name="unitPrice"
                    min="1"
                    placeholder="45000"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-bold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-600">Discount Amount (INR) *</label>
                  <input
                    type="number"
                    name="discount"
                    min="0"
                    defaultValue="0"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">GST percentage (%)</label>
                <select
                  name="gst"
                  defaultValue="0"
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-bold"
                >
                  <option value="0">0% (Default)</option>
                  <option value="5">5% GST</option>
                  <option value="18">18% GST</option>
                </select>
                <input
                  type="hidden"
                  name="validUntil"
                  value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Quotation Proposal Terms Notes</label>
                <textarea
                  name="notes"
                  placeholder="e.g. Terms: 40% Advance, 60% post-QC and before dispatch. 3 years structural warranty..."
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none h-16"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#593622] hover:bg-[#4d2f1e] text-white py-2.5 rounded-xl font-bold transition shadow-md text-xs mt-3 cursor-pointer"
              >
                Log and Issue Price Quote
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 3. SCHEDULE FOLLOWUP MODAL */}
      {showAddFollowupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 w-full max-w-md space-y-4"
          >
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-[#593622] font-display uppercase tracking-tight">
                Schedule Customer Call / Follow-up
              </h3>
              <button onClick={() => setShowAddFollowupModal(false)} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFollowup} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-600">Select Customer Lead *</label>
                <select
                  required
                  name="customerId"
                  defaultValue={selectedCustomerId || ''}
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-bold"
                >
                  <option value="" disabled>-- Select Customer --</option>
                  {db.crmCustomers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-600">Follow-up Date *</label>
                  <input
                    required
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-600">Follow-up Time *</label>
                  <input
                    required
                    type="time"
                    name="time"
                    defaultValue="11:00"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Follow-up reminder purpose *</label>
                <input
                  required
                  type="text"
                  name="reminder"
                  placeholder="e.g. Call to discuss wood sample choices & finalize veneer"
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Additional Instructions Notes</label>
                <textarea
                  name="notes"
                  placeholder="e.g. Customer prefers WhatsApp message prior to voice call..."
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none h-16"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#593622] hover:bg-[#4d2f1e] text-white py-2.5 rounded-xl font-bold transition shadow-md text-xs mt-3 cursor-pointer"
              >
                Schedule Planner Entry
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 4. CUSTOMER FILE ATTACHMENT MODAL */}
      {showAttachmentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 w-full max-w-lg space-y-4 max-h-[95vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#593622] font-display uppercase tracking-tight">
                  Attach Design Reference or Document
                </h3>
                <p className="text-[10px] text-stone-400 font-medium">Add workshop references, CAD designs, or snap live custom photos</p>
              </div>
              <button 
                onClick={() => {
                  stopCamera();
                  setShowAttachmentModal(false);
                }} 
                className="text-stone-400 hover:text-stone-700 cursor-pointer p-1 rounded-full hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-600">Attachment Category *</label>
                  <select
                    value={attachCategory}
                    onChange={(e) => setAttachCategory(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-bold text-stone-700"
                  >
                    <option value="Design Image">Design Image</option>
                    <option value="Reference Photo">Reference Photo</option>
                    <option value="PDF">PDF Document</option>
                    <option value="CAD Drawing">CAD Drawing</option>
                    <option value="Invoice">Invoice Receipt</option>
                    <option value="Agreement">Agreement Form</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-600">File Description Name *</label>
                  <input
                    type="text"
                    required
                    value={attachFileName}
                    onChange={(e) => setAttachFileName(e.target.value)}
                    placeholder="e.g. 6-Seater Dining Sketch Frame v2"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-semibold text-stone-700"
                  />
                </div>
              </div>

              {/* Source selection choices */}
              <div className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50 p-4 space-y-4">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block font-mono">
                  Select Source / Method
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setCapturedImage(null);
                      const fileInput = document.getElementById('computer-file-picker');
                      if (fileInput) fileInput.click();
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-bold transition cursor-pointer ${
                      uploadedFileData 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                        : 'bg-white border-stone-200 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Upload size={14} />
                    <span>From Computer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileData(null);
                      if (isCameraActive) {
                        stopCamera();
                      } else {
                        startCamera();
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-bold transition cursor-pointer ${
                      isCameraActive || capturedImage
                        ? 'bg-[#593622]/10 border-[#593622]/30 text-[#593622]' 
                        : 'bg-white border-stone-200 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Camera size={14} />
                    <span>{isCameraActive ? 'Stop Camera' : capturedImage ? 'Photo Recaptured' : 'Snap Live Photo'}</span>
                  </button>
                </div>

                {/* Hidden Native File Input */}
                <input
                  type="file"
                  id="computer-file-picker"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Sub-panels based on action */}
                {uploadedFileData && (
                  <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-emerald-800">
                    <div className="min-w-0">
                      <p className="font-bold text-[11px] truncate">Selected file ready!</p>
                      <p className="text-[10px] text-emerald-600 font-mono">File successfully loaded into memory</p>
                    </div>
                    <button
                      onClick={() => setUploadedFileData(null)}
                      className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {isCameraActive && (
                  <div className="space-y-2.5">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-stone-300">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-full shadow-lg text-[11px] uppercase tracking-wider transition cursor-pointer"
                        >
                          Capture Snapshot
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-stone-400 text-center italic">Align design blueprint paper or material samples in frame</p>
                  </div>
                )}

                {capturedImage && (
                  <div className="space-y-2">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-stone-200 shadow-inner">
                      <img
                        src={capturedImage}
                        alt="Captured reference snapshot"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 right-2 bg-black/70 text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded-full tracking-wider">
                        Snapshot Preview
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-emerald-600 font-bold">Photo successfully captured!</span>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="text-[#593622] hover:underline font-bold font-mono cursor-pointer"
                      >
                        Retake Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setShowAttachmentModal(false);
                  }}
                  className="w-1/3 bg-stone-100 hover:bg-stone-200 text-stone-700 py-2.5 rounded-xl font-bold transition text-xs cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUploadedAttachment}
                  disabled={!attachFileName.trim() || (!capturedImage && !uploadedFileData)}
                  className={`w-2/3 py-2.5 rounded-xl font-bold transition text-xs text-center cursor-pointer shadow-md ${
                    attachFileName.trim() && (capturedImage || uploadedFileData)
                      ? 'bg-[#593622] hover:bg-[#402414] text-white'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  Confirm Attachment
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
