/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import companyLogoImg from '../assets/images/logo.png';
import upiQrImg from '../assets/images/upi_qr.png';
import signatureImg from '../assets/images/signature.svg';
import { 
  AppState,
  generateArticleNumber
} from '../db/store';
import { compareOrdersByArticleSerialDesc } from '../utils';
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
  Upload,
  Printer,
  Download,
  Share2,
  Image,
  QrCode,
  FileSignature,
  Package,
  Sparkles,
  Layers,
  Globe,
  Briefcase,
  Play,
  Store,
  ShoppingBag,
  Compass,
  Loader2,
  Truck,
  PieChart as PieChartIcon
} from 'lucide-react';

function getAmountInWords(num: number): string {
  if (!num || num === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const helper = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + helper(n % 100) : '');
    if (n < 100000) return helper(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + helper(n % 1000) : '');
    if (n < 10000000) return helper(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + helper(n % 100000) : '');
    return helper(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + helper(n % 10000000) : '');
  };
  
  return helper(Math.round(num)).trim() + ' Rupees Only';
}
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
import { formatToDDMMYYYY, generateNewOrderNo } from '../utils';

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
  onApproveQuotation?: (quote: CRMQuotation) => void;
  crmAction?: 'add-customer' | 'new-quotation' | null;
  onResetCrmAction?: () => void;
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
  users,
  onApproveQuotation,
  crmAction,
  onResetCrmAction,
}: CRMTabProps) {
  const [subTab, setSubTab] = React.useState<'dashboard' | 'customers' | 'quotations' | 'followups'>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);

  function generateCRMCustomerId(allCustomers: CRMCustomer[]): string {
    const d = new Date();
    const yy = d.getFullYear().toString().slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `CRM-${yy}-${mm}-`;

    let maxSerial = 0;
    if (allCustomers && allCustomers.length > 0) {
      allCustomers.forEach((c) => {
        if (c.id && c.id.startsWith(prefix)) {
          const serialPart = c.id.substring(prefix.length);
          const serialNum = parseInt(serialPart, 10);
          if (!isNaN(serialNum) && serialNum > maxSerial) {
            maxSerial = serialNum;
          }
        }
      });
    }
    const nextSerial = maxSerial + 1;
    const sss = String(nextSerial).padStart(3, '0');
    return `${prefix}${sss}`;
  }

  function generateCRMQuotationId(allQuotations: CRMQuotation[]): string {
    const d = new Date();
    const yy = d.getFullYear().toString().slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `QT-${yy}-${mm}-`;

    let maxSerial = 0;
    if (allQuotations && allQuotations.length > 0) {
      allQuotations.forEach((q) => {
        if (q.id && q.id.startsWith(prefix)) {
          const serialPart = q.id.substring(prefix.length);
          const serialNum = parseInt(serialPart, 10);
          if (!isNaN(serialNum) && serialNum > maxSerial) {
            maxSerial = serialNum;
          }
        }
      });
    }
    const nextSerial = maxSerial + 1;
    const sss = String(nextSerial).padStart(3, '0');
    return `${prefix}${sss}`;
  }
  
  // Dialog States
  const [showAddCustModal, setShowAddCustModal] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<CRMCustomer | null>(null);
  const [showAddQuoteModal, setShowAddQuoteModal] = React.useState(false);
  const [editingQuotation, setEditingQuotation] = React.useState<CRMQuotation | null>(null);
  const [showAddFollowupModal, setShowAddFollowupModal] = React.useState(false);
  const [viewingEstimateQuote, setViewingEstimateQuote] = React.useState<CRMQuotation | null>(null);
  const [isUploadingItemIdx, setIsUploadingItemIdx] = React.useState<number | null>(null);
  const [previewImageModalUrl, setPreviewImageModalUrl] = React.useState<string | null>(null);

  const [quoteCustomerId, setQuoteCustomerId] = React.useState<string>('');
  const [quoteItems, setQuoteItems] = React.useState<CRMQuotationItem[]>([]);
  const [quoteTransportationCharges, setQuoteTransportationCharges] = React.useState<number>(0);
  const [showTransportationInput, setShowTransportationInput] = React.useState<boolean>(false);
  const [quoteDiscount, setQuoteDiscount] = React.useState<number>(0);
  const [quoteGst, setQuoteGst] = React.useState<number>(0);
  const [quoteValidUntil, setQuoteValidUntil] = React.useState<string>('');
  const [quotePaymentTerms, setQuotePaymentTerms] = React.useState<string>('');
  const [quoteDeliveryTerms, setQuoteDeliveryTerms] = React.useState<string>('');
  const [quoteNotes, setQuoteNotes] = React.useState<string>('');
  const [quoteReceivedAmount, setQuoteReceivedAmount] = React.useState<number>(0);

  const allAvailableCustomers = React.useMemo(() => {
    const list: Array<{ id: string; name: string; phone?: string; city?: string; productRequirement?: string; status?: string }> = [];
    const seenIds = new Set<string>();

    (db.crmCustomers || []).forEach(c => {
      if (c && c.id && !seenIds.has(c.id)) {
        seenIds.add(c.id);
        list.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          city: c.city,
          productRequirement: c.productRequirement,
          status: c.status
        });
      }
    });

    (db.customers || []).forEach(c => {
      if (c && c.id && !seenIds.has(c.id)) {
        seenIds.add(c.id);
        list.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          city: c.address,
          productRequirement: c.notes,
          status: 'Customer'
        });
      }
    });

    return list;
  }, [db.crmCustomers, db.customers]);

  React.useEffect(() => {
    if (showAddQuoteModal) {
      if (editingQuotation) {
        setQuoteCustomerId(editingQuotation.customer_id || '');
        const loadedItems = editingQuotation.items && editingQuotation.items.length > 0
          ? editingQuotation.items.map(item => ({
              id: item.id || generateId('item'),
              furnitureItem: item.furnitureItem || '',
              material: item.material || 'Solid Teak Wood(Sagwan)',
              dimensions: item.dimensions || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              discount: item.discount || 0,
              gst: item.gst || 0,
              totalAmount: item.totalAmount || ((item.quantity || 1) * (item.unitPrice || 0)),
              images: item.images || []
            }))
          : [{
              id: generateId('item'),
              furnitureItem: '',
              material: 'Solid Teak Wood(Sagwan)',
              dimensions: '',
              quantity: 1,
              unitPrice: 0,
              discount: 0,
              gst: 0,
              totalAmount: 0,
              images: []
            }];
        setQuoteItems(loadedItems);
        setQuoteTransportationCharges(editingQuotation.transportation_charges || 0);
        setShowTransportationInput(Boolean(editingQuotation.transportation_charges && editingQuotation.transportation_charges > 0));
        setQuoteDiscount(editingQuotation.discount !== undefined ? editingQuotation.discount : (editingQuotation.items?.[0]?.discount || 0));
        setQuoteGst(editingQuotation.gst !== undefined ? editingQuotation.gst : (editingQuotation.items?.[0]?.gst || 0));
        setQuoteValidUntil(editingQuotation.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setQuotePaymentTerms(editingQuotation.paymentTerms || '40% Advance on order confirmation, 60% before dispatch post-QC inspection.');
        setQuoteDeliveryTerms(editingQuotation.deliveryTerms || 'Ex-workshop dispatch / Transport charges extra at actuals.');
        setQuoteNotes(editingQuotation.notes || '');
        setQuoteReceivedAmount(editingQuotation.received_amount || 0);
      } else {
        const initialCustId = selectedCustomerId || '';
        setQuoteCustomerId(initialCustId);
        const customer = db.crmCustomers?.find(c => c.id === initialCustId);
        setQuoteItems([{
          id: generateId('item'),
          furnitureItem: customer?.productRequirement || '',
          material: 'Solid Teak Wood(Sagwan)',
          dimensions: '',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          gst: 0,
          totalAmount: 0,
          images: []
        }]);
        setQuoteTransportationCharges(0);
        setShowTransportationInput(false);
        setQuoteDiscount(0);
        setQuoteGst(0);
        setQuoteValidUntil(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setQuotePaymentTerms('40% Advance on order confirmation, 60% before dispatch post-QC inspection.');
        setQuoteDeliveryTerms('Ex-workshop dispatch / Transport charges extra at actuals.');
        setQuoteNotes('');
        setQuoteReceivedAmount(0);
      }
    } else {
      setQuoteCustomerId('');
      setQuoteItems([]);
      setQuoteTransportationCharges(0);
      setShowTransportationInput(false);
      setQuoteDiscount(0);
      setQuoteGst(0);
      setQuoteValidUntil('');
      setQuotePaymentTerms('');
      setQuoteDeliveryTerms('');
      setQuoteNotes('');
      setQuoteReceivedAmount(0);
    }
  }, [showAddQuoteModal, editingQuotation, selectedCustomerId, db.crmCustomers]);

  const handleAddProductItem = () => {
    setQuoteItems(prev => [
      ...prev,
      {
        id: generateId('item'),
        furnitureItem: '',
        material: 'Solid Teak Wood(Sagwan)',
        dimensions: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        gst: 0,
        totalAmount: 0,
        images: []
      }
    ]);
  };

  const handleRemoveProductItem = (idx: number) => {
    if (quoteItems.length <= 1) return;
    setQuoteItems(prev => prev.filter((_, i) => i !== idx));
  };

  const compressAndReadFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = (e.target?.result as string) || '';
        if (!rawDataUrl) {
          resolve('');
          return;
        }
        try {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              let width = img.width || 800;
              let height = img.height || 600;
              const maxDim = 1200;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              canvas.width = Math.max(1, width);
              canvas.height = Math.max(1, height);
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(compressedDataUrl || rawDataUrl);
              } else {
                resolve(rawDataUrl);
              }
            } catch {
              resolve(rawDataUrl);
            }
          };
          img.onerror = () => resolve(rawDataUrl);
          img.src = rawDataUrl;
        } catch {
          resolve(rawDataUrl);
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleItemImagesUpload = async (idx: number, filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    const filesArray = Array.from(filesList);
    setIsUploadingItemIdx(idx);

    try {
      const newImageDataUrls: string[] = [];
      for (const file of filesArray) {
        const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic|bmp|svg)$/i.test(file.name);
        if (isImg) {
          const compressed = await compressAndReadFile(file);
          if (compressed) {
            newImageDataUrls.push(compressed);
          }
        }
      }
      if (newImageDataUrls.length > 0) {
        setQuoteItems(prev => prev.map((item, i) => {
          if (i === idx) {
            return {
              ...item,
              images: [...(item.images || []), ...newImageDataUrls]
            };
          }
          return item;
        }));
      }
    } catch (err) {
      console.error("Quotation image upload error:", err);
    } finally {
      setIsUploadingItemIdx(null);
    }
  };

  const handleRemoveItemImage = (itemIdx: number, imgIdx: number) => {
    setQuoteItems(prev => prev.map((item, i) => {
      if (i === itemIdx) {
        const updatedImages = (item.images || []).filter((_, imI) => imI !== imgIdx);
        return {
          ...item,
          images: updatedImages
        };
      }
      return item;
    }));
  };

  const handleUpdateProductItem = (idx: number, field: keyof CRMQuotationItem, val: any) => {
    setQuoteItems(prev => prev.map((item, i) => {
      if (i === idx) {
        const updated = { ...item, [field]: val };
        const q = Number(updated.quantity) || 0;
        const p = Number(updated.unitPrice) || 0;
        updated.totalAmount = q * p;
        return updated;
      }
      return item;
    }));
  };

  const quoteSubtotal = quoteItems.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
  const quoteTransportationAmt = Number(quoteTransportationCharges) || 0;
  const quoteDiscountAmt = Number(quoteDiscount) || 0;
  const quoteTaxableSubtotal = Math.max(0, quoteSubtotal + quoteTransportationAmt - quoteDiscountAmt);
  const quoteGstPercent = Number(quoteGst) || 0;
  const quoteGstAmt = Math.round(quoteTaxableSubtotal * (quoteGstPercent / 100));
  const quoteGrandTotal = quoteTaxableSubtotal + quoteGstAmt;

  // Customized printable estimate asset states (stored in localStorage for persistence)
  const [customLogo, setCustomLogo] = React.useState<string | null>(() => localStorage.getItem('estimate_custom_logo'));
  const [customQR, setCustomQR] = React.useState<string | null>(() => localStorage.getItem('estimate_custom_qr'));
  const [customSignature, setCustomSignature] = React.useState<string | null>(() => localStorage.getItem('estimate_custom_signature'));

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

  // Filter States for Customer Directory & Quotations
  const [custSearch, setCustSearch] = React.useState('');
  const [quoteSearch, setQuoteSearch] = React.useState('');
  const [custViewMode, setCustViewMode] = React.useState<'grid' | 'table'>('table');
  const [custFilter, setCustFilter] = React.useState<'all' | 'active' | 'repeat' | 'pending_payment' | 'completed' | 'vip'>('all');

  // CRM Dashboard Compact Date Range Filter State
  type DateRangePreset = 'today' | '7days' | '30days' | '4months' | 'currentmonth' | 'all' | 'custom';
  const [datePreset, setDatePreset] = React.useState<DateRangePreset>('currentmonth');
  const [customStartDate, setCustomStartDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = React.useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isFilterLoading, setIsFilterLoading] = React.useState<boolean>(false);

  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === datePreset) return;
    setIsFilterLoading(true);
    setDatePreset(preset);
    setTimeout(() => {
      setIsFilterLoading(false);
    }, 250);
  };

  const getDateFilterBounds = (
    preset: DateRangePreset,
    customStart?: string,
    customEnd?: string
  ): { startMs: number | null; endMs: number | null } => {
    if (preset === 'all') return { startMs: null, endMs: null };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (preset === 'today') {
      return { startMs: todayStart.getTime(), endMs: todayEnd.getTime() };
    }

    if (preset === '7days') {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { startMs: start.getTime(), endMs: todayEnd.getTime() };
    }

    if (preset === '30days') {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { startMs: start.getTime(), endMs: todayEnd.getTime() };
    }

    if (preset === '4months') {
      const start = new Date(todayStart);
      start.setMonth(start.getMonth() - 4);
      return { startMs: start.getTime(), endMs: todayEnd.getTime() };
    }

    if (preset === 'currentmonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { startMs: start.getTime(), endMs: todayEnd.getTime() };
    }

    if (preset === 'custom') {
      let startMs: number | null = null;
      let endMs: number | null = null;
      if (customStart) {
        const s = new Date(customStart + 'T00:00:00');
        if (!isNaN(s.getTime())) startMs = s.getTime();
      }
      if (customEnd) {
        const e = new Date(customEnd + 'T23:59:59.999');
        if (!isNaN(e.getTime())) endMs = e.getTime();
      }
      return { startMs, endMs };
    }

    return { startMs: null, endMs: null };
  };

  const isDateInBounds = (
    dateStr?: string,
    startMs?: number | null,
    endMs?: number | null
  ): boolean => {
    if (startMs === null && endMs === null) return true;
    if (!dateStr) return false;

    let time: number | null = null;
    const str = dateStr.trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const datePart = str.split('T')[0];
      const parts = datePart.split('-');
      time = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0).getTime();
    } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(str)) {
      const parts = str.split(/[\/\-]/);
      time = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12, 0, 0).getTime();
    } else {
      const parsed = new Date(str).getTime();
      if (!isNaN(parsed)) time = parsed;
    }

    if (time === null || isNaN(time)) return false;

    if (startMs !== null && time < startMs) return false;
    if (endMs !== null && time > endMs) return false;
    return true;
  };

  const isAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager';
  const isArtisan = currentUser.role === 'carpenter' || currentUser.role === 'polish_person';
  const hasWriteAccess = isAdmin || isManager;

  // React on quick crm actions triggered externally
  React.useEffect(() => {
    if (crmAction && hasWriteAccess) {
      if (crmAction === 'add-customer') {
        setSubTab('customers');
        setEditingCustomer(null);
        setShowAddCustModal(true);
      } else if (crmAction === 'new-quotation') {
        setSubTab('quotations');
        setEditingQuotation(null);
        setShowAddQuoteModal(true);
      }
      if (onResetCrmAction) {
        onResetCrmAction();
      }
    }
  }, [crmAction, hasWriteAccess, onResetCrmAction]);

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
    const rawStatus = cust.status ? String(cust.status).trim() : '';
    if (['Disqualified', 'Cancelled', 'Deal Lost'].includes(rawStatus)) {
      return 'Disqualified';
    }

    const custOrders = db.orders?.filter(o => o.customer_id === cust.id) || [];
    if (custOrders.length > 0) {
      const allDispatched = custOrders.every(o => o.current_status === 'Dispatched');
      if (allDispatched) {
        return 'Delivered';
      }
      const hasInProduction = custOrders.some(o => 
        !['Pending', 'Dispatched'].includes(o.current_status)
      );
      if (hasInProduction) {
        return 'In Production';
      }
      return 'Order Confirmed';
    }

    const custQuotes = db.crmQuotations?.filter(q => q.customer_id === cust.id) || [];
    if (custQuotes.length > 0) {
      if (custQuotes.some(q => q.status === 'Approved')) {
        return 'Order Confirmed';
      }
      if (custQuotes.some(q => q.status === 'Sent')) {
        return 'Quotation Sent';
      }
      if (custQuotes.some(q => q.status === 'Draft')) {
        return 'Quotation Pending';
      }
    }

    const custFollowUps = db.crmFollowUps?.filter(f => f.customer_id === cust.id) || [];
    if (custFollowUps.length > 0) {
      return 'Follow-up';
    }

    if (rawStatus && rawStatus !== 'New Inquiry' && rawStatus !== 'New Lead') {
      return rawStatus;
    }

    return 'New Inquiry';
  };

  const getStatusLabelWithEmoji = (status: string): string => {
    switch (status) {
      case 'New Inquiry':
      case 'New Lead': return '🟥 New Lead';
      case 'Quotation Pending':
      case 'Contacted': return '🟨 Contacted';
      case 'Quotation Sent':
      case 'Quote Sent': return '🟦 Quote Sent';
      case 'Follow-up':
      case 'Qualified': return '🟪 Qualified';
      case 'Order Confirmed':
      case 'Closed Won': return '🟩 Closed Won';
      case 'In Production': return '🏭 In Production';
      case 'Delivered': return '🟫 Delivered';
      case 'Disqualified':
      case 'Deal Lost':
      case 'Cancelled': return '⚫ Disqualified';
      default: return '🟥 New Lead';
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
      case 'Disqualified':
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

      const baseOrderId = generateNewOrderNo(undefined, db.orders, db.crmQuotations);
      const itemsList = latestQuote.items && latestQuote.items.length > 0
        ? latestQuote.items
        : [{ furnitureItem: 'Bespoke Item', quantity: 1, dimensions: 'Custom Size', material: 'Premium Plywood & Teak Veneer', unitPrice: latestQuote.totalAmount }];

      const defaultCarp = users.find(u => u.role === 'carpenter')?.id || 'user_rinku_v_prod';
      let primaryArticleNo = '';

      itemsList.forEach((item, idx) => {
        const orderId = itemsList.length > 1 ? `${baseOrderId}-${idx + 1}` : baseOrderId;
        const articleNo = generateArticleNumber('Living Room', defaultCarp, db.orders || [], users, idx);
        if (idx === 0) primaryArticleNo = articleNo;

        const newOrder: Order = {
          id: orderId,
          parent_order_id: baseOrderId,
          article_no: articleNo,
          customer_id: latestQuote.customer_id,
          category: 'Living Room',
          sub_category: item.furnitureItem || 'Bespoke Item',
          size: 'Custom',
          custom_size: item.dimensions || 'Custom Size',
          finish: 'Premium Lacquer Polish',
          special_notes: `Converted from Quotation ${latestQuote.id}. ${latestQuote.notes || ''}`,
          design_type: 'Custom',
          material: item.material || 'Premium Plywood & Teak Veneer',
          color_shade: 'Teak / Walnut',
          no_of_units: item.quantity || 1,
          carpenter_id: defaultCarp,
          current_status: 'Designing',
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
      });

      const orderId = baseOrderId;
      const articleNo = primaryArticleNo;

      const receivedAdvance = (latestQuote.received_amount !== undefined && latestQuote.received_amount !== null && Number(latestQuote.received_amount) > 0)
        ? Number(latestQuote.received_amount)
        : Math.round(latestQuote.totalAmount * 0.4);
      const remainingBalance = Math.max(0, latestQuote.totalAmount - receivedAdvance);

      const crmPay: CRMPayment = {
        id: generateId('pay'),
        customer_id: latestQuote.customer_id,
        order_id: orderId,
        total_amount: latestQuote.totalAmount,
        advance_paid: receivedAdvance,
        balance_due: remainingBalance,
        payment_method: 'UPI',
        payment_date: new Date().toISOString().split('T')[0],
        pending_amount: remainingBalance
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
      const orderId = generateNewOrderNo(undefined, db.orders, db.crmQuotations);
      const defaultCarp = users.find(u => u.role === 'carpenter')?.id || 'user_rinku_v_prod';
      const articleNo = generateArticleNumber('Living Room', defaultCarp, db.orders || [], users, 0);
      
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
        current_status: 'Designing',
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

  // Active customers fetched directly from the Customer Directory (excluding any deleted or invalid records)
  const directoryCustomers = React.useMemo(() => {
    return (db.crmCustomers || []).filter(c =>
      c &&
      c.id &&
      c.id.trim() !== '' &&
      (Boolean(c.name?.trim()) || Boolean(c.phone?.trim()) || Boolean(c.productRequirement?.trim()))
    );
  }, [db.crmCustomers]);

  // 1. STATS CALCULATIONS WITH DATE RANGE FILTERING
  const { startMs, endMs } = getDateFilterBounds(datePreset, customStartDate, customEndDate);

  const filteredCrmCustomers = directoryCustomers.filter(c =>
    isDateInBounds(c.created_at, startMs, endMs)
  );

  const filteredOrders = (db.orders || []).filter(o =>
    isDateInBounds(o.order_date || o.created_at, startMs, endMs)
  );

  const totalCustomers = filteredCrmCustomers.length;
  const activeOrders = filteredOrders.filter(o => o.current_status !== 'Dispatched').length;
  const completedOrders = filteredOrders.filter(o => o.current_status === 'Dispatched').length;
  const pendingQuotes = (db.crmQuotations || []).filter(q =>
    isDateInBounds(q.created_at, startMs, endMs) && (q.status === 'Sent' || q.status === 'Draft')
  ).length;
  
  const followupsToday = (db.crmFollowUps || []).filter(f =>
    isDateInBounds(f.date || f.created_at, startMs, endMs) && f.status === 'Pending'
  );
  
  // Filter valid payments linked to existing orders and customers within date bounds
  const validOrderIds = new Set((db.orders || []).map(o => o.id));
  const validCustomerIds = new Set(directoryCustomers.map(c => c.id));

  const validPayments = (db.payments || []).filter(p =>
    (!p.order_id || validOrderIds.has(p.order_id)) &&
    isDateInBounds(p.payment_date || p.created_at, startMs, endMs)
  );

  const validCrmPayments = (db.crmPayments || []).filter(cp => {
    if (cp.customer_id && !validCustomerIds.has(cp.customer_id)) return false;
    if (cp.order_id && !validOrderIds.has(cp.order_id)) return false;
    return isDateInBounds(cp.payment_date, startMs, endMs);
  });

  // Calculate advance paid directly on filtered orders if not present in payments array
  const orderDirectAdvances = filteredOrders.reduce((sum, o) => {
    const hasPaymentRecord = validPayments.some(p => p.order_id === o.id);
    if (!hasPaymentRecord && o.advance_paid) {
      return sum + (Number(o.advance_paid) || 0);
    }
    return sum;
  }, 0);

  // Total Revenue Calculation (summing valid payments within selected date bounds)
  const totalRevenue = (validPayments.reduce((acc, p) => acc + (p.advance_paid || 0), 0)) +
                       (validCrmPayments.reduce((acc, cp) => acc + (cp.advance_paid || 0), 0)) +
                       orderDirectAdvances;
  
  // Repeat Customers (Customers with > 1 order)
  const customerOrderCounts = (db.orders || []).reduce((acc: Record<string, number>, o) => {
    acc[o.customer_id] = (acc[o.customer_id] || 0) + 1;
    return acc;
  }, {});
  
  const repeatCustomersCount = filteredCrmCustomers.filter(c => (customerOrderCounts[c.id] || 0) > 1).length;

  // Recent activity logs (Timeline Events filtered by date bounds)
  const recentActivities = [...(db.crmTimelineEvents || [])]
    .filter(t => isDateInBounds(t.timestamp, startMs, endMs))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  // Helper to extract YYYY-MM key from various date formats safely
  const getYearMonthKey = (dateStr?: string): string | null => {
    if (!dateStr) return null;
    const str = dateStr.trim();
    const yyyyMmMatch = str.match(/^(\d{4})-(\d{2})/);
    if (yyyyMmMatch) {
      return `${yyyyMmMatch[1]}-${yyyyMmMatch[2]}`;
    }
    const ddMmYyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddMmYyyyMatch) {
      const month = ddMmYyyyMatch[2].padStart(2, '0');
      const year = ddMmYyyyMatch[3];
      return `${year}-${month}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return null;
  };

  // Generate dynamic 6-month window up to current month
  const now = new Date();
  const last6Months: { key: string; name: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const name = d.toLocaleString('en-US', { month: 'short' });
    last6Months.push({ key, name });
  }

  // All valid payments without date filtering (for 6-month historical trend charts)
  const allValidPayments = (db.payments || []).filter(p => !p.order_id || validOrderIds.has(p.order_id));
  const allValidCrmPayments = (db.crmPayments || []).filter(cp => {
    if (cp.customer_id && !validCustomerIds.has(cp.customer_id)) return false;
    if (cp.order_id && !validOrderIds.has(cp.order_id)) return false;
    return true;
  });

  // 2. DYNAMIC CHART DATA CONSTRUCTIONS
  // (a) Monthly Orders Volume (computed across all historical orders over 6 months)
  const monthlyOrdersData = last6Months.map(({ key, name }) => {
    const count = (db.orders || []).filter(o => {
      const k = getYearMonthKey(o.order_date || o.created_at);
      return k === key;
    }).length;
    return { name, orders: count };
  });

  // (b) Revenue Trend (computed across all historical payments over 6 months)
  const revenueTrendData = last6Months.map(({ key, name }) => {
    const paymentSum = allValidPayments.filter(p => {
      const k = getYearMonthKey(p.payment_date || p.created_at);
      return k === key;
    }).reduce((acc, p) => acc + (p.advance_paid || 0), 0);

    const crmPaymentSum = allValidCrmPayments.filter(cp => {
      const k = getYearMonthKey(cp.payment_date);
      return k === key;
    }).reduce((acc, cp) => acc + (cp.advance_paid || 0), 0);

    const directOrderSum = (db.orders || []).filter(o => {
      const k = getYearMonthKey(o.order_date || o.created_at);
      if (k !== key) return false;
      const hasPaymentRecord = allValidPayments.some(p => p.order_id === o.id);
      return !hasPaymentRecord && o.advance_paid;
    }).reduce((acc, o) => acc + (Number(o.advance_paid) || 0), 0);

    return { name, revenue: paymentSum + crmPaymentSum + directOrderSum };
  });

  // (c) Source Performance (calculated from filteredCrmCustomers)
  const sourceBarColors: Record<string, string> = {
    'IndiaMART': '#6D4025',     // Coffee Brown
    'Walkin': '#D97706',        // Amber Orange
    'Manual': '#1A110A',        // Dark Brown
    'TradeIndia': '#EA7300',    // Bright Orange
    'Email': '#F2B233',         // Gold
    'Website': '#6366F1',       // Blue
    'Social Media': '#A855F7',   // Purple
    'Youtube': '#6D4025',       // Coffee Brown
    'Reference': '#6B7280',     // Gray
  };

  const defaultSourcesList = ['Walkin', 'Social Media', 'Reference', 'Website'];
  const crmCustomerList = filteredCrmCustomers;
  const sourceCounts: Record<string, number> = {};

  crmCustomerList.forEach(cust => {
    const src = cust.source ? cust.source.trim() : 'Walkin';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });

  const totalLeadsCount = crmCustomerList.length;
  const allSourceNames = Array.from(new Set([...Object.keys(sourceCounts), ...defaultSourcesList]));

  const sourcePerformanceData = allSourceNames
    .map(name => ({
      name,
      count: sourceCounts[name] || 0,
      color: sourceBarColors[name] || '#6D4025'
    }))
    .filter(item => totalLeadsCount > 0 ? item.count > 0 : ['Walkin', 'Social Media', 'Reference', 'Website'].includes(item.name))
    .sort((a, b) => b.count - a.count);

  const maxSourceCount = Math.max(...sourcePerformanceData.map(d => d.count), 1);

  // (d) Current Lead Stage Distribution
  const leadStageDefs = [
    { key: 'New Lead', label: 'New Lead', color: '#1A110A', aliases: ['New Inquiry', 'New Lead'] },
    { key: 'Contacted', label: 'Contacted', color: '#6366F1', aliases: ['Quotation Pending', 'Contacted'] },
    { key: 'Qualified', label: 'Qualified', color: '#A855F7', aliases: ['Follow-up', 'Qualified'] },
    { key: 'Quote Sent', label: 'Quote Sent', color: '#EA7300', aliases: ['Quotation Sent', 'Quote Sent'] },
    { key: 'Closed Won', label: 'Closed Won', color: '#D97706', aliases: ['Order Confirmed', 'Closed Won'] },
    { key: 'In Production', label: 'In Production', color: '#6D4025', aliases: ['In Production'] },
    { key: 'Delivered', label: 'Delivered', color: '#F2B233', aliases: ['Delivered'] },
    { key: 'Disqualified', label: 'Disqualified', color: '#6B7280', aliases: ['Disqualified', 'Cancelled', 'Deal Lost'] },
  ];

  const stageCountsMap: Record<string, number> = {
    'New Lead': 0,
    'Contacted': 0,
    'Qualified': 0,
    'Quote Sent': 0,
    'Closed Won': 0,
    'In Production': 0,
    'Delivered': 0,
    'Disqualified': 0,
  };

  filteredCrmCustomers.forEach(cust => {
    const status = getCustomerStatus(cust);
    let matchedKey = 'New Lead';
    for (const def of leadStageDefs) {
      if (def.aliases.includes(status)) {
        matchedKey = def.key;
        break;
      }
    }
    stageCountsMap[matchedKey] = (stageCountsMap[matchedKey] || 0) + 1;
  });

  const currentLeadStageData = leadStageDefs.map(def => ({
    name: def.label,
    value: stageCountsMap[def.key] || 0,
    color: def.color,
  }));

  // 3. ACTION HANDLERS
  const handleAddEditCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasWriteAccess) return;
    const formData = new FormData(e.currentTarget);
    
    const custId = editingCustomer ? editingCustomer.id : generateCRMCustomerId(db.crmCustomers || []);
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

    // Update Quotation Status to Approved
    const updatedQuote: CRMQuotation = {
      ...quote,
      status: 'Approved'
    };
    onSaveCRMQuotation(updatedQuote);

    // Update Customer status in the CRM
    const customer = db.crmCustomers?.find(c => c.id === quote.customer_id);
    if (customer) {
      onSaveCRMCustomer({
        ...customer,
        status: 'Order Confirmed'
      });
    }

    // Add Timeline Event
    const timelineEvent: CRMTimelineEvent = {
      id: generateId('evt'),
      customer_id: quote.customer_id,
      type: 'quotation_approved',
      title: 'Approved Quotation Draft',
      description: `Quotation ${quote.id} approved for total value ₹${(quote.totalAmount ?? 0).toLocaleString('en-IN')}. Synthesized to Detail Order Form draft registry.`,
      timestamp: new Date().toISOString(),
      operator: currentUser.name
    };
    onSaveCRMTimelineEvent(timelineEvent);

    if (onApproveQuotation) {
      onApproveQuotation(updatedQuote);
    } else {
      alert(`Success! Quotation ${quote.id} marked as Approved Quotation Draft.`);
    }
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

  const handleSaveQuotation = (statusToSave: 'Draft' | 'Sent') => {
    if (!hasWriteAccess) return;
    if (!quoteCustomerId) {
      alert('Please select a Customer Lead.');
      return;
    }
    if (quoteItems.length === 0) {
      alert('Please add at least one product item to the quotation.');
      return;
    }
    const emptyItem = quoteItems.find(i => !i.furnitureItem || !i.furnitureItem.trim());
    if (emptyItem) {
      alert('Please fill in the Item Name for all products.');
      return;
    }
    if (quoteReceivedAmount > quoteGrandTotal) {
      alert(`Received Amount (₹${quoteReceivedAmount.toLocaleString('en-IN')}) cannot be greater than the Grand Total Amount (₹${quoteGrandTotal.toLocaleString('en-IN')}).`);
      return;
    }

    const customer = allAvailableCustomers.find(c => c.id === quoteCustomerId) || db.crmCustomers?.find(c => c.id === quoteCustomerId) || db.customers?.find(c => c.id === quoteCustomerId);
    const quoteId = editingQuotation ? editingQuotation.id : generateCRMQuotationId(db.crmQuotations || []);
    const nextEstimateNo = (db.crmQuotations && db.crmQuotations.length > 0) 
      ? Math.max(0, ...db.crmQuotations.map(q => q.estimateNo || 0)) + 1 
      : 1;

    const formattedItems: CRMQuotationItem[] = quoteItems.map(item => {
      const q = Math.max(1, Number(item.quantity) || 1);
      const p = Math.max(0, Number(item.unitPrice) || 0);
      return {
        id: item.id || generateId('item'),
        furnitureItem: item.furnitureItem.trim(),
        quantity: q,
        material: item.material || 'Solid Teak Wood(Sagwan)',
        dimensions: item.dimensions || '',
        unitPrice: p,
        discount: 0,
        gst: quoteGstPercent,
        totalAmount: q * p,
        images: item.images || []
      };
    });

    const newQuote: CRMQuotation = {
      id: quoteId,
      customer_id: quoteCustomerId,
      customer_name: customer ? customer.name : 'Unknown Customer',
      items: formattedItems,
      subtotal: quoteSubtotal,
      transportation_charges: quoteTransportationAmt,
      discount: quoteDiscountAmt,
      gst: quoteGstPercent,
      gstAmount: quoteGstAmt,
      totalAmount: quoteGrandTotal,
      validUntil: quoteValidUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentTerms: quotePaymentTerms,
      deliveryTerms: quoteDeliveryTerms,
      notes: quoteNotes,
      status: editingQuotation ? (editingQuotation.status === 'Approved' ? 'Approved' : statusToSave) : statusToSave,
      created_at: editingQuotation ? editingQuotation.created_at : new Date().toISOString(),
      created_by: editingQuotation ? editingQuotation.created_by : currentUser.name,
      estimateNo: editingQuotation ? editingQuotation.estimateNo : nextEstimateNo,
      description: quoteNotes,
      termsAndConditions: `${quotePaymentTerms ? 'Payment Terms: ' + quotePaymentTerms + '\n' : ''}${quoteDeliveryTerms ? 'Delivery Terms: ' + quoteDeliveryTerms : ''}`,
      received_amount: Math.max(0, quoteReceivedAmount)
    };

    onSaveCRMQuotation(newQuote);

    // Add Timeline Event
    onSaveCRMTimelineEvent({
      id: generateId('evt'),
      customer_id: quoteCustomerId,
      type: statusToSave === 'Draft' ? 'note_added' : 'quotation_sent',
      title: editingQuotation ? 'Price Quotation Updated' : (statusToSave === 'Draft' ? 'Quotation Draft Saved' : 'Quotation Issued to Client'),
      description: `Quotation ${quoteId} (${quoteItems.length} product${quoteItems.length > 1 ? 's' : ''}: ${quoteItems.map(i => i.furnitureItem).join(', ')}) saved for ₹${quoteGrandTotal.toLocaleString('en-IN')}.`,
      timestamp: new Date().toISOString(),
      operator: currentUser.name
    });

    setShowAddQuoteModal(false);
    setEditingQuotation(null);
    alert(`Success: Quotation ${quoteId} ${editingQuotation ? 'updated' : 'created'} successfully (${statusToSave}).`);
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
  const filteredCustomersList = (db.crmCustomers || [])
    .filter(c => {
      if (!c || (!c.name?.trim() && !c.phone?.trim() && !c.id?.trim())) return false;
      const nameStr = c.name || '';
      const phoneStr = c.phone || '';
      const idStr = c.id || '';

      const matchesSearch = nameStr.toLowerCase().includes(custSearch.toLowerCase()) ||
        phoneStr.includes(custSearch) ||
        (c.productRequirement && c.productRequirement.toLowerCase().includes(custSearch.toLowerCase())) ||
        (c.city && c.city.toLowerCase().includes(custSearch.toLowerCase())) ||
        idStr.toLowerCase().includes(custSearch.toLowerCase());

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
    })
    .sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return (b.id || '').localeCompare(a.id || '');
    });

  const filteredQuotationsList = (db.crmQuotations || [])
    .filter(quote => {
      if (!quote || (!quote.customer_name?.trim() && (!quote.items || quote.items.length === 0) && !quote.id?.trim())) return false;
      if (!quoteSearch.trim()) return true;
      const term = quoteSearch.toLowerCase().trim();
      const matchId = quote.id?.toLowerCase().includes(term);
      const matchCustName = quote.customer_name?.toLowerCase().includes(term);
      const matchStatus = quote.status?.toLowerCase().includes(term);
      const matchItems = quote.items?.some(i => 
        i.furnitureItem?.toLowerCase().includes(term) ||
        i.material?.toLowerCase().includes(term) ||
        i.dimensions?.toLowerCase().includes(term)
      );
      return matchId || matchCustName || matchStatus || matchItems;
    })
    .sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return (b.id || '').localeCompare(a.id || '');
    });

  const selectedCustomer = db.crmCustomers?.find(c => c.id === selectedCustomerId);
  const selectedCustOrders = selectedCustomer ? (db.orders?.filter(o => o.customer_id === selectedCustomer.id) || []).sort(compareOrdersByArticleSerialDesc) : [];
  const selectedCustQuotes = selectedCustomer 
    ? (db.crmQuotations?.filter(q => q.customer_id === selectedCustomer.id) || []).sort((a, b) => {
        if (a.created_at && b.created_at) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return (b.id || '').localeCompare(a.id || '');
      })
    : [];
  const selectedCustFollowups = selectedCustomer ? db.crmFollowUps?.filter(f => f.customer_id === selectedCustomer.id) || [] : [];
  const selectedCustPayments = selectedCustomer ? db.crmPayments?.filter(p => p.customer_id === selectedCustomer.id) || [] : [];
  const selectedCustNotes = selectedCustomer ? db.crmNotes?.filter(n => n.customer_id === selectedCustomer.id).sort((a,b)=> new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [] : [];
  const selectedCustTimeline = selectedCustomer ? db.crmTimelineEvents?.filter(t => t.customer_id === selectedCustomer.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [] : [];
  const selectedCustAttachments = selectedCustomer ? db.crmAttachments?.filter(a => a.customer_id === selectedCustomer.id) || [] : [];

  return (
    <div className="space-y-6">
      {/* CRM Main Header Row */}
      <div className="border-b border-stone-200 pb-5 space-y-4">
        <div>
          <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight flex items-center gap-2">
            <Contact className="text-[#593622]" size={26} /> CRM Module
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            Bespoke woodworks customer relationship dashboard, lead funnels, and quotation converters
          </p>
        </div>

        {/* Action Buttons & Tabs Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
          {/* Left: Quick Action Buttons */}
          {hasWriteAccess ? (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setEditingCustomer(null);
                  setShowAddCustModal(true);
                  if (subTab !== 'customers') setSubTab('customers');
                  setSelectedCustomerId(null);
                }}
                className="bg-[#4a2c1b] hover:bg-[#382114] text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <UserPlus size={15} /> Add Customer
              </button>
              <button
                onClick={() => {
                  setEditingQuotation(null);
                  setShowAddQuoteModal(true);
                }}
                className="bg-[#e05e00] hover:bg-[#c75300] text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus size={16} /> New Quotation
              </button>
            </div>
          ) : <div />}

          {/* Right: Navigation tabs */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/80 max-w-full overflow-x-auto shrink-0">
            <button
              onClick={() => { setSubTab('dashboard'); setSelectedCustomerId(null); }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                subTab === 'dashboard' ? 'bg-[#593622] text-white shadow' : 'text-stone-600 hover:text-[#593622]'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setSubTab('customers')}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                subTab === 'customers' ? 'bg-[#593622] text-white shadow' : 'text-stone-600 hover:text-[#593622]'
              }`}
            >
              Customers Directory
            </button>
            <button
              onClick={() => { setSubTab('quotations'); setSelectedCustomerId(null); }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                subTab === 'quotations' ? 'bg-[#593622] text-white shadow' : 'text-stone-600 hover:text-[#593622]'
              }`}
            >
              Quotations
            </button>
            <button
              onClick={() => { setSubTab('followups'); setSelectedCustomerId(null); }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                subTab === 'followups' ? 'bg-[#593622] text-white shadow' : 'text-stone-600 hover:text-[#593622]'
              }`}
            >
              Follow-ups
            </button>
          </div>
        </div>
      </div>

      {/* SUBTAB: DASHBOARD */}
      {subTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Compact Date Range Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/80 border border-stone-200/90 p-2.5 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-[#593622] tracking-wider font-display flex items-center gap-1.5">
                <Calendar size={14} className="text-[#593622]" /> Date Filter
              </span>
              {isFilterLoading ? (
                <span className="text-[10px] text-amber-800 font-bold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Fetching data...
                </span>
              ) : (
                <span className="text-[10px] text-stone-500 font-mono font-bold">
                  {datePreset === 'all' && 'All Historical Records'}
                  {datePreset === 'today' && `Today (${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})`}
                  {datePreset === '7days' && 'Last 7 Days'}
                  {datePreset === '30days' && 'Last 30 Days'}
                  {datePreset === '4months' && 'Last 4 Months'}
                  {datePreset === 'currentmonth' && `Current Month (${new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})`}
                  {datePreset === 'custom' && `${customStartDate || 'Start'} to ${customEndDate || 'End'}`}
                </span>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 max-w-full">
              {/* Segmented Control Bar */}
              <div className="flex items-center bg-stone-200/80 p-1 rounded-2xl border border-stone-300/80 max-w-full overflow-x-auto no-scrollbar shadow-2xs">
                <button
                  onClick={() => handlePresetChange('today')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === 'today'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handlePresetChange('7days')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === '7days'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => handlePresetChange('30days')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === '30days'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => handlePresetChange('4months')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === '4months'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  4 Months
                </button>
                <button
                  onClick={() => handlePresetChange('currentmonth')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === 'currentmonth'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  Current Month
                </button>
                <button
                  onClick={() => handlePresetChange('all')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === 'all'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => handlePresetChange('custom')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === 'custom'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {/* Custom Date Inputs */}
              {datePreset === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 pt-1 flex-wrap justify-end"
                >
                  <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl px-2.5 py-1 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-stone-500">Start:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value);
                        setIsFilterLoading(true);
                        setTimeout(() => setIsFilterLoading(false), 200);
                      }}
                      className="bg-transparent text-xs font-mono font-bold text-stone-900 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl px-2.5 py-1 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-stone-500">End:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value);
                        setIsFilterLoading(true);
                        setTimeout(() => setIsFilterLoading(false), 200);
                      }}
                      className="bg-transparent text-xs font-mono font-bold text-stone-900 focus:outline-none cursor-pointer"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Top KPI Metrics Cards and Charts Container */}
          <div className={`space-y-6 transition-opacity duration-200 ${isFilterLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            {/* Current Lead Stage Distribution */}
            <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase text-stone-700 tracking-wider font-display">Current Lead Stage Distribution</span>
                <Activity className="text-stone-400" size={16} />
              </div>

              <div className="min-h-[220px] flex items-center justify-between gap-2">
                {totalLeadsCount > 0 ? (
                  <>
                    <div className="w-5/12 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={currentLeadStageData.filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={46}
                            outerRadius={68}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {currentLeadStageData.filter(d => d.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val: number) => [`${val} lead(s)`, 'Count']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-7/12 space-y-1.5 pr-1 max-h-52 overflow-y-auto">
                      {currentLeadStageData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-xs py-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-stone-700 font-semibold truncate">{item.name}</span>
                          </div>
                          <span className="text-stone-900 font-mono font-black text-xs ml-2">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="w-full text-center py-10 text-stone-400 text-xs font-medium">
                    No customer leads recorded yet.
                  </div>
                )}
              </div>

              <div className="border-t border-stone-200/80 pt-3 mt-2 flex justify-between items-center text-xs font-bold text-stone-500 font-mono">
                <span>Total leads: {totalLeadsCount}</span>
              </div>
            </div>

            {/* Source Performance */}
            <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black uppercase text-stone-700 tracking-wider font-display">Source Performance</span>
                <PieChartIcon className="text-stone-400" size={16} />
              </div>

              <div className="space-y-3 min-h-[200px] max-h-[280px] overflow-y-auto pr-1">
                {sourcePerformanceData.length > 0 ? (
                  sourcePerformanceData.map((item) => {
                    const percentage = maxSourceCount > 0 ? (item.count / maxSourceCount) * 100 : 0;
                    
                    let IconComponent = Globe;
                    if (item.name === 'IndiaMART') IconComponent = Store;
                    else if (item.name === 'Walkin') IconComponent = Building;
                    else if (item.name === 'Manual') IconComponent = FileText;
                    else if (item.name === 'TradeIndia') IconComponent = Briefcase;
                    else if (item.name === 'Social Media') IconComponent = Share2;
                    else if (item.name === 'Email') IconComponent = Mail;
                    else if (item.name === 'Youtube') IconComponent = Play;
                    else if (item.name === 'Reference') IconComponent = UserCheck;

                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-stone-200 bg-stone-50/80 flex items-center justify-center shrink-0 shadow-2xs">
                          <IconComponent size={15} style={{ color: item.color }} />
                        </div>

                        <span className="w-24 text-xs font-semibold text-stone-700 truncate shrink-0">
                          {item.name}
                        </span>

                        <div className="flex-1 bg-[#f1ece4] h-8 rounded-xl p-0.5 relative flex items-center overflow-hidden">
                          <div
                            className="h-full rounded-lg flex items-center justify-center px-2.5 text-xs font-bold text-white transition-all duration-500 shadow-2xs min-w-[28px]"
                            style={{
                              width: item.count > 0 ? `${Math.max(12, percentage)}%` : '28px',
                              backgroundColor: item.color,
                              opacity: item.count > 0 ? 1 : 0.4
                            }}
                          >
                            {item.count}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-stone-400 text-xs italic">
                    No lead source data available
                  </div>
                )}
              </div>

              <div className="border-t border-stone-200/80 pt-3 mt-4 flex justify-between items-center text-xs font-bold text-stone-500 font-mono">
                <span>Total leads: {totalLeadsCount}</span>
              </div>
            </div>

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
                        BY {act.operator} | STAMP: {formatToDDMMYYYY(act.timestamp)}
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
                        placeholder="Search by name, requirement, city, mobile..."
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
                              <th className="p-4">Product Requirement</th>
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
                                  <td className="p-4 text-stone-500 max-w-xs truncate" title={cust.productRequirement}>{cust.productRequirement || '-'}</td>
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
                          RECORD CREATED: {formatToDDMMYYYY(selectedCustomer.created_at)}
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
                              <option value="Disqualified">⚫ Disqualified</option>
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
                              selectedCustQuotes.map(q => {
                                const qImages = (q.items || []).flatMap(i => i.images || []).filter(Boolean);
                                return (
                                  <div key={q.id} className="bg-white border border-stone-200 p-3 rounded-xl flex items-center justify-between shadow-xs">
                                    <div>
                                      <strong className="text-xs text-stone-950 font-bold block">{q.id}</strong>
                                      <span className="text-[10px] text-stone-500 block">₹{(q.totalAmount ?? 0).toLocaleString('en-IN')} | Valid: {formatToDDMMYYYY(q.validUntil)}</span>
                                      {qImages.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                          {qImages.slice(0, 3).map((imgUrl, imgI) => (
                                            <img
                                              key={imgI}
                                              src={imgUrl}
                                              alt={`Photo ${imgI + 1}`}
                                              className="w-7 h-7 rounded-md border border-stone-300 object-cover hover:scale-110 transition cursor-pointer"
                                              onClick={() => setPreviewImageModalUrl(imgUrl)}
                                              title="Click to zoom image"
                                            />
                                          ))}
                                          {qImages.length > 3 && (
                                            <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-1 py-0.5 rounded font-mono">
                                              +{qImages.length - 3}
                                            </span>
                                          )}
                                        </div>
                                      )}
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
                                );
                              })
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
                                    <span>{formatToDDMMYYYY(n.timestamp)}</span>
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
                                    {formatToDDMMYYYY(evt.timestamp)} | BY: {evt.operator}
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
          <div className="bg-white border border-stone-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shadow-xs">
            <div className="flex flex-1 gap-2 flex-wrap items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 text-stone-400" size={14} />
                <input
                  type="text"
                  value={quoteSearch}
                  onChange={(e) => setQuoteSearch(e.target.value)}
                  placeholder="Search by ID, customer name, status, or item..."
                  className="w-full pl-9 pr-4 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-[#593622] transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-stone-500 font-bold">
                Showing {filteredQuotationsList.length} quotation{filteredQuotationsList.length === 1 ? '' : 's'}
              </span>
              {hasWriteAccess && (
                <button
                  onClick={() => {
                    setEditingQuotation(null);
                    setShowAddQuoteModal(true);
                  }}
                  className="bg-[#e05e00] hover:bg-[#c75300] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={15} /> New Quotation
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Quotation ID</th>
                    <th className="p-4">Customer Lead</th>
                    <th className="p-4">Product Items Included</th>
                    <th className="p-4">Total Qty</th>
                    <th className="p-4">Valid Until</th>
                    <th className="p-4">Estimated Value</th>
                    <th className="p-4">Current Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {filteredQuotationsList.length > 0 ? (
                    filteredQuotationsList.map(quote => {
                      const itemsCount = quote.items?.length || 0;
                      const firstItem = quote.items?.[0];
                      const totalQty = quote.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 1;
                      const quoteImages = (quote.items || []).flatMap(i => i.images || []).filter(Boolean);
                      return (
                        <tr key={quote.id} className="hover:bg-stone-50/50 transition">
                          <td className="p-4 font-mono font-bold text-[#593622]">{quote.id}</td>
                          <td className="p-4 text-stone-900 font-bold">{quote.customer_name}</td>
                          <td className="p-4">
                            {itemsCount > 1 ? (
                              <div>
                                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                  <span>{firstItem?.furnitureItem}</span>
                                  <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                    +{itemsCount - 1} more product{itemsCount - 1 > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="text-[10px] text-stone-500 truncate max-w-xs mt-0.5">
                                  {quote.items?.map(i => i.furnitureItem).join(', ')}
                                </div>
                              </div>
                            ) : (
                              <div className="font-bold text-stone-900">
                                {firstItem?.furnitureItem || 'Custom Scope'}
                              </div>
                            )}

                            {/* Attached Product Photos Thumbnails */}
                            {quoteImages.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-2">
                                {quoteImages.slice(0, 3).map((imgUrl, imgI) => (
                                  <img
                                    key={imgI}
                                    src={imgUrl}
                                    alt={`Quote ${quote.id} Photo ${imgI + 1}`}
                                    className="w-8 h-8 rounded-lg border border-stone-300 object-cover shadow-2xs hover:scale-110 transition cursor-pointer bg-white"
                                    onClick={() => setPreviewImageModalUrl(imgUrl)}
                                    title="Click to view photo"
                                  />
                                ))}
                                {quoteImages.length > 3 && (
                                  <span className="text-[9px] font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-md font-mono">
                                    +{quoteImages.length - 3} photos
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-mono font-bold text-stone-700">{totalQty}</td>
                          <td className="p-4 font-mono text-stone-600">{formatToDDMMYYYY(quote.validUntil)}</td>
                          <td className="p-4 font-mono font-bold text-stone-950">₹{(quote.totalAmount ?? 0).toLocaleString('en-IN')}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              quote.status === 'Approved' ? 'bg-green-100 text-green-700' :
                              quote.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                              quote.status === 'Draft' ? 'bg-amber-100 text-amber-700' :
                              quote.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                              'bg-stone-100 text-stone-700'
                            }`}>
                              {quote.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5 items-center">
                              {quote.status === 'Sent' && hasWriteAccess && (
                                <button
                                  onClick={() => handleConvertQuotationToOrder(quote)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition shadow-xs whitespace-nowrap"
                                  title="Approve & Convert to Production Order"
                                >
                                  <FileCheck size={12} />
                                  <span>Approve & Convert</span>
                                </button>
                              )}
                              {hasWriteAccess && (
                                <button
                                  onClick={() => {
                                    setEditingQuotation(quote);
                                    setShowAddQuoteModal(true);
                                  }}
                                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer"
                                  title="Edit Quotation"
                                >
                                  <Edit size={13} />
                                </button>
                              )}
                              <button
                                onClick={() => setViewingEstimateQuote(quote)}
                                className="bg-[#593622] hover:bg-[#482b1b] text-white p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer"
                                title="View Estimate Receipt"
                              >
                                <Eye size={13} />
                              </button>
                              {quote.status === 'Sent' && hasWriteAccess && (
                                <button
                                  onClick={() => {
                                    const updated = { ...quote, status: 'Rejected' as const };
                                    onSaveCRMQuotation(updated);
                                    alert('Quotation marked Rejected.');
                                  }}
                                  className="bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer"
                                  title="Mark Rejected"
                                >
                                  <XCircle size={13} />
                                </button>
                              )}
                              {hasWriteAccess && (
                                <button
                                  onClick={() => {
                                    if (window.confirm('Delete this quotation permanently?')) {
                                      onDeleteCRMQuotation(quote.id);
                                    }
                                  }}
                                  className="text-stone-400 hover:text-rose-500 p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer"
                                  title="Delete Quotation"
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
                        No quotations found matching your search. Click "New Quotation" to generate lead proposals.
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
                        <Calendar size={12} className="text-stone-400" /> Date: <span className="text-stone-800 font-mono font-bold">{formatToDDMMYYYY(f.date)}</span>
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
                  <option value="Walkin">Walkin</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Reference">Reference</option>
                  <option value="Website">Website</option>
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
                  <option value="Disqualified">Disqualified</option>
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

      {/* 2. GENERATE / EDIT MULTI-PRODUCT QUOTATION MODAL */}
      {showAddQuoteModal && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-7xl h-[94vh] max-h-[94vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-[#593622] text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight font-display uppercase text-white">
                      {editingQuotation ? `Edit Price Quotation (${editingQuotation.id})` : 'New Multi-Product Quotation'}
                    </h3>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                      {editingQuotation ? editingQuotation.id : generateCRMQuotationId(db.crmQuotations || [])}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-0.5">
                    Assign unlimited products & specs under one unified customer lead quotation
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setShowAddQuoteModal(false); setEditingQuotation(null); }}
                className="text-stone-400 hover:text-white bg-stone-800/60 hover:bg-stone-800 p-2 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-stone-50/60">
              {/* Step 1: Customer Lead Selection */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#593622]/10 text-[#593622] flex items-center justify-center text-xs font-black">
                      1
                    </div>
                    <h4 className="text-sm font-extrabold text-stone-900 tracking-tight">Customer Lead Information</h4>
                  </div>
                  {quoteCustomerId && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                      <CheckCircle size={12} /> Lead Linked
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-stone-700 text-xs flex items-center gap-1">
                        Select Customer Lead <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCustomer(null);
                          setShowAddCustModal(true);
                        }}
                        className="text-[11px] font-bold text-[#593622] hover:text-[#402414] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} /> New Customer Lead
                      </button>
                    </div>
                    <select
                      required
                      value={quoteCustomerId}
                      onChange={(e) => {
                        const custId = e.target.value;
                        setQuoteCustomerId(custId);
                        const customer = allAvailableCustomers.find(c => c.id === custId);
                        if (customer && customer.productRequirement && quoteItems.length === 1 && !quoteItems[0].furnitureItem) {
                          setQuoteItems([{ ...quoteItems[0], furnitureItem: customer.productRequirement }]);
                        }
                      }}
                      className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] focus:ring-1 focus:ring-[#593622] rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900"
                    >
                      <option value="" disabled>-- Select Customer Lead --</option>
                      {allAvailableCustomers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.id}) {c.phone ? `• ${c.phone}` : ''}</option>
                      ))}
                    </select>
                  </div>

                  {/* Customer Quick Summary Card */}
                  {(() => {
                    const selectedCust = allAvailableCustomers.find(c => c.id === quoteCustomerId) || db.crmCustomers?.find(c => c.id === quoteCustomerId);
                    if (!selectedCust) return (
                      <div className="border border-dashed border-stone-200 rounded-xl p-3 bg-stone-50/50 flex items-center justify-center text-stone-400 text-xs italic">
                        Select a customer lead above to view contact details
                      </div>
                    );
                    return (
                      <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3 text-xs space-y-1">
                        <div className="font-extrabold text-stone-900 flex justify-between items-center">
                          <span>{selectedCust.name}</span>
                          <span className="text-[10px] text-amber-800 font-mono font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                            ID: {selectedCust.id}
                          </span>
                        </div>
                        <div className="text-stone-600 text-[11px] flex flex-wrap gap-x-3 gap-y-0.5">
                          {selectedCust.phone && <span>📞 {selectedCust.phone}</span>}
                          {selectedCust.city && <span>📍 {selectedCust.city}</span>}
                          {selectedCust.status && <span>🏷️ {selectedCust.status}</span>}
                        </div>
                        {selectedCust.productRequirement && (
                          <div className="text-[11px] text-[#593622] font-semibold pt-1 border-t border-amber-200/60 truncate">
                            Requirement: {selectedCust.productRequirement}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Step 2: Repeatable Product Items Section */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#593622]/10 text-[#593622] flex items-center justify-center text-xs font-black">
                      2
                    </div>
                    <h4 className="text-sm font-extrabold text-stone-900 tracking-tight">Product Items Specification</h4>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-900 px-3 py-1 rounded-full font-extrabold">
                    {quoteItems.length} Product{quoteItems.length > 1 ? 's' : ''} Added
                  </span>
                </div>

                {/* Product Cards Loop */}
                <div className="space-y-4">
                  {quoteItems.map((item, idx) => {
                    const itemSub = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    return (
                      <div
                        key={item.id || idx}
                        className="bg-stone-50/70 border border-stone-200 hover:border-amber-400/80 rounded-2xl p-4 sm:p-5 shadow-2xs transition-all space-y-4 relative group"
                      >
                        {/* Item Card Top Bar */}
                        <div className="flex items-center justify-between border-b border-stone-200/70 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#593622] text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                              PRODUCT #{idx + 1}
                            </span>
                            {item.furnitureItem && (
                              <span className="text-xs font-bold text-stone-800 truncate max-w-xs sm:max-w-md">
                                {item.furnitureItem}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-extrabold text-stone-900 bg-white border border-stone-200 px-3 py-1 rounded-xl shadow-2xs">
                              Item Value: <span className="text-[#593622]">₹{itemSub.toLocaleString('en-IN')}</span>
                            </span>
                            {quoteItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveProductItem(idx)}
                                className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                                title="Remove Product Item"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Item Fields */}
                        <div className="space-y-3">
                          {/* Item Name */}
                          <div className="space-y-1">
                            <label className="font-bold text-stone-700 text-xs flex justify-between">
                              <span>Item / Product Name <span className="text-rose-500">*</span></span>
                              <span className="text-[10px] text-stone-400 font-normal">e.g. Dining Table, Sofa, Wardrobe, Bed</span>
                            </label>
                            <input
                              required
                              type="text"
                              value={item.furnitureItem}
                              onChange={(e) => handleUpdateProductItem(idx, 'furnitureItem', e.target.value)}
                              placeholder="e.g. 6-Seater Teakwood Dining Table"
                              className="w-full bg-white border border-stone-200 focus:border-[#593622] focus:ring-1 focus:ring-[#593622] rounded-xl px-3.5 py-2 text-xs font-semibold text-stone-900"
                            />
                            {!item.furnitureItem && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                <span className="text-[10px] text-stone-400 font-bold self-center">Quick Presets:</span>
                                {['6-Seater Dining Table', 'King Size Storage Bed', '3-Seater Leatherette Sofa', '4-Door Teak Wardrobe', 'Modular Tv Console', 'Coffee Table'].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => handleUpdateProductItem(idx, 'furnitureItem', preset)}
                                    className="text-[10px] bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-600 px-2 py-0.5 rounded-md transition cursor-pointer"
                                  >
                                    + {preset}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Material & Dimensions */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="font-bold text-stone-700 text-xs">Premium Wood / Material</label>
                              <select
                                value={item.material === 'Solid Teak Wood' ? 'Solid Teak Wood(Sagwan)' : (item.material || 'Solid Teak Wood(Sagwan)')}
                                onChange={(e) => handleUpdateProductItem(idx, 'material', e.target.value)}
                                className="w-full bg-white border border-stone-200 focus:border-[#593622] focus:ring-1 focus:ring-[#593622] rounded-xl px-3.5 py-2 text-xs font-semibold text-stone-900 cursor-pointer shadow-2xs"
                              >
                                <option value="Solid Teak Wood(Sagwan)">Solid Teak Wood(Sagwan)</option>
                                <option value="Solid Shivan Wood">Solid Shivan Wood</option>
                                <option value="Solid Aakashi Wood">Solid Aakashi Wood</option>
                                <option value="Mix Wood">Mix Wood</option>
                                <option value="Plywood">Plywood</option>
                                {item.material &&
                                  !['Solid Teak Wood(Sagwan)', 'Solid Shivan Wood', 'Solid Aakashi Wood', 'Mix Wood', 'Plywood', 'Solid Teak Wood'].includes(item.material) && (
                                    <option value={item.material}>{item.material}</option>
                                  )}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-stone-700 text-xs">Dimensions Specification</label>
                              <input
                                type="text"
                                value={item.dimensions}
                                onChange={(e) => handleUpdateProductItem(idx, 'dimensions', e.target.value)}
                                placeholder="e.g. 72L x 36W x 30H inches"
                                className="w-full bg-white border border-stone-200 focus:border-[#593622] focus:ring-1 focus:ring-[#593622] rounded-xl px-3.5 py-2 text-xs font-mono text-stone-800"
                              />
                            </div>
                          </div>

                          {/* Qty, Unit Cost, Subtotal */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="font-bold text-stone-700 text-xs">Quantity <span className="text-rose-500">*</span></label>
                              <input
                                required
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateProductItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-white border border-stone-200 focus:border-[#593622] focus:ring-1 focus:ring-[#593622] rounded-xl px-3.5 py-2 text-xs font-bold text-stone-900"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-stone-700 text-xs">Unit Cost (INR) <span className="text-rose-500">*</span></label>
                              <input
                                required
                                type="number"
                                min="0"
                                value={item.unitPrice || ''}
                                onChange={(e) => handleUpdateProductItem(idx, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                                placeholder="e.g. 45000"
                                className="w-full bg-white border border-stone-200 focus:border-[#593622] focus:ring-1 focus:ring-[#593622] rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-stone-900"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-stone-500 text-xs">Product Subtotal</label>
                              <div className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-stone-900 flex items-center justify-between">
                                <span>₹</span>
                                <span>{itemSub.toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>

                          {/* UPLOAD PRODUCT IMAGES SECTION */}
                          <div className="space-y-2 pt-2 border-t border-stone-200/80">
                            <div className="flex items-center justify-between">
                              <label className="font-bold text-stone-700 text-xs flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-[#593622]">
                                <Image size={14} className="text-[#593622]" /> Upload Product Photos
                              </label>
                              <span className="text-[10px] text-stone-500 font-bold">
                                {item.images && item.images.length > 0
                                  ? `✅ ${item.images.length} photo(s) attached`
                                  : 'JPG, PNG, WEBP, HEIC'}
                              </span>
                            </div>

                            {/* Dropzone Area wrapped with label */}
                            <label
                              htmlFor={`item-img-input-${idx}`}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files) {
                                  handleItemImagesUpload(idx, e.dataTransfer.files);
                                }
                              }}
                              className="border-2 border-dashed border-amber-300/80 hover:border-[#593622] bg-amber-50/40 hover:bg-amber-50/80 rounded-2xl p-4 transition text-center cursor-pointer block relative group"
                            >
                              <input
                                id={`item-img-input-${idx}`}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    handleItemImagesUpload(idx, e.target.files);
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                                {isUploadingItemIdx === idx ? (
                                  <div className="flex items-center gap-2 text-xs font-bold text-[#593622] py-2">
                                    <Loader2 size={20} className="animate-spin text-[#593622]" />
                                    <span>Compressing and attaching images...</span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="w-10 h-10 rounded-full bg-white border border-stone-200 shadow-2xs flex items-center justify-center text-stone-600 group-hover:text-[#593622] group-hover:border-amber-400 transition">
                                      <Upload size={18} />
                                    </div>
                                    <div className="text-xs text-stone-800 font-bold">
                                      Drag & drop product photos here or <span className="text-[#593622] underline font-extrabold">click to upload</span>
                                    </div>
                                    <div className="text-[10px] text-stone-500 font-mono uppercase tracking-wider font-semibold">
                                      Upload photos of designs, reference sketches, or CAD renderings
                                    </div>
                                  </>
                                )}
                              </div>
                            </label>

                            {/* Thumbnail Gallery Preview if Images Exist */}
                            {item.images && item.images.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                  Attached Photos Preview ({item.images.length}):
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  {item.images.map((imgSrc, imgIdx) => (
                                    <div
                                      key={imgIdx}
                                      className="relative group/thumb w-24 h-24 sm:w-28 sm:h-28 rounded-xl border-2 border-stone-200 hover:border-[#593622] overflow-hidden bg-white shadow-xs shrink-0 transition"
                                    >
                                      <img
                                        src={imgSrc}
                                        alt={`PRODUCT #${idx + 1} Image ${imgIdx + 1}`}
                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                                        onClick={() => setPreviewImageModalUrl(imgSrc)}
                                      />
                                      <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImageModalUrl(imgSrc);
                                          }}
                                          className="p-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg transition cursor-pointer"
                                          title="Zoom Preview"
                                        >
                                          <Eye size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveItemImage(idx, imgIdx);
                                          }}
                                          className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition cursor-pointer"
                                          title="Delete Image"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                      <span className="absolute bottom-1 left-1 bg-stone-900/80 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-2xs">
                                        Photo #{imgIdx + 1}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Product Button */}
                <button
                  type="button"
                  onClick={handleAddProductItem}
                  className="w-full py-3.5 px-4 bg-amber-50/60 hover:bg-amber-100/80 border-2 border-dashed border-amber-300 hover:border-amber-400 rounded-2xl text-[#593622] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                >
                  <Plus size={18} />
                  <span>+ Add Product</span>
                </button>

                {/* Add Transportation Charges Section */}
                {!showTransportationInput && quoteTransportationAmt === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowTransportationInput(true)}
                    className="w-full py-3 px-4 bg-emerald-50/70 hover:bg-emerald-100/90 border-2 border-dashed border-emerald-300 hover:border-emerald-400 rounded-2xl text-emerald-900 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs group"
                  >
                    <Truck size={17} className="text-emerald-700 group-hover:scale-110 transition-transform" />
                    <span>+ Add Transportation Charges</span>
                  </button>
                ) : (
                  <div className="bg-emerald-50/60 border border-emerald-300/80 rounded-2xl p-4 space-y-3 shadow-2xs transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Truck size={15} />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                            Transportation / Freight Charges
                          </h5>
                          <p className="text-[10px] text-emerald-800 font-medium">
                            Added directly to the invoice below Subtotal & included in Grand Total.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setQuoteTransportationCharges(0);
                          setShowTransportationInput(false);
                        }}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        title="Remove Transportation Charges"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-2.5 text-emerald-700 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={quoteTransportationCharges === 0 ? '' : quoteTransportationCharges}
                          onChange={(e) => setQuoteTransportationCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="Enter transportation charge in ₹"
                          className="w-full bg-white border border-emerald-300 focus:border-emerald-600 rounded-xl pl-8 pr-3.5 py-2 font-mono text-emerald-950 text-xs font-black placeholder:text-stone-400 outline-none transition shadow-2xs"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[500, 1000, 1500, 2000, 2500, 3000, 5000].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setQuoteTransportationCharges(amt)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer font-mono ${
                              quoteTransportationCharges === amt
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100/80'
                            }`}
                          >
                            +₹{amt.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Shared Quotation Fields & Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Shared Terms & Notes */}
                <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                    <div className="w-6 h-6 rounded-full bg-[#593622]/10 text-[#593622] flex items-center justify-center text-xs font-black">
                      3
                    </div>
                    <h4 className="text-sm font-extrabold text-stone-900 tracking-tight">Proposal Terms & Conditions</h4>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {/* Validity Date */}
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Quotation Validity Date</label>
                      <input
                        type="date"
                        value={quoteValidUntil}
                        onChange={(e) => setQuoteValidUntil(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3.5 py-2 font-mono font-bold text-stone-900"
                      />
                    </div>

                    {/* Payment Terms */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-stone-700">Payment Terms</label>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setQuotePaymentTerms('40% Advance on order confirmation, 60% before dispatch post-QC inspection.')}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-0.5 rounded cursor-pointer"
                          >
                            40% / 60%
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuotePaymentTerms('50% Advance on order confirmation, 50% on final delivery & installation.')}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-0.5 rounded cursor-pointer"
                          >
                            50% / 50%
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={quotePaymentTerms}
                        onChange={(e) => setQuotePaymentTerms(e.target.value)}
                        placeholder="e.g. 40% Advance on order, 60% post-QC prior to dispatch"
                        className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3.5 py-2 text-stone-800"
                      />
                    </div>

                    {/* Delivery Terms */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-stone-700">Delivery Terms</label>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setQuoteDeliveryTerms('Ex-workshop dispatch / Transport charges extra at actuals.')}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-0.5 rounded cursor-pointer"
                          >
                            Ex-workshop
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuoteDeliveryTerms('Includes door delivery & white-glove on-site assembly.')}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-0.5 rounded cursor-pointer"
                          >
                            Door Delivery
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={quoteDeliveryTerms}
                        onChange={(e) => setQuoteDeliveryTerms(e.target.value)}
                        placeholder="e.g. Ex-workshop dispatch, transport charges at actuals"
                        className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3.5 py-2 text-stone-800"
                      />
                    </div>

                    {/* Notes & proposal details */}
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700">Quotation Proposal Terms Notes</label>
                      <textarea
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        placeholder="Enter custom warranty terms, timber moisture guarantee, or special notes..."
                        className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3.5 py-2 text-stone-800 h-20"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Calculations Summary Card */}
                <div className="lg:col-span-5 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white p-6 rounded-2xl shadow-xl border border-stone-800 flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                      <h4 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider font-display">
                        Quotation Financial Summary
                      </h4>
                      <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">
                        Live Auto-Calc
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Subtotal */}
                      <div className="flex justify-between items-center">
                        <span className="text-stone-300">Total Item Value (Subtotal)</span>
                        <span className="font-mono font-bold text-stone-100">
                          ₹{quoteSubtotal.toLocaleString('en-IN')}.00
                        </span>
                      </div>

                      {/* Transportation Charges row */}
                      {(quoteTransportationAmt > 0 || showTransportationInput) && (
                        <div className="flex justify-between items-center py-1.5 px-2.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-300">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Truck size={13} className="text-emerald-400" />
                            Transportation Charges
                          </span>
                          <span className="font-mono font-black text-emerald-300">
                            +₹{quoteTransportationAmt.toLocaleString('en-IN')}.00
                          </span>
                        </div>
                      )}

                      {/* Discount Input */}
                      <div className="space-y-1 pt-2 border-t border-stone-800">
                        <div className="flex justify-between items-center">
                          <label className="text-stone-300 font-bold">Discount Amount (INR)</label>
                          <span className="text-rose-400 font-mono text-[11px]">
                            -₹{quoteDiscountAmt.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={quoteDiscount || ''}
                          onChange={(e) => setQuoteDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full bg-stone-800/80 border border-stone-700 focus:border-amber-400 rounded-xl px-3.5 py-2 font-mono text-stone-100 text-xs font-bold"
                        />
                      </div>

                      {/* Taxable Value */}
                      <div className="flex justify-between items-center text-stone-300 text-[11px]">
                        <span>Taxable Value</span>
                        <span className="font-mono font-semibold">₹{quoteTaxableSubtotal.toLocaleString('en-IN')}.00</span>
                      </div>

                      {/* GST Percentage */}
                      <div className="space-y-1 pt-2 border-t border-stone-800">
                        <div className="flex justify-between items-center">
                          <label className="text-stone-300 font-bold">GST Percentage (%)</label>
                          <span className="text-amber-300 font-mono text-[11px]">
                            +₹{quoteGstAmt.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <select
                          value={quoteGst}
                          onChange={(e) => setQuoteGst(Number(e.target.value))}
                          className="w-full bg-stone-800/80 border border-stone-700 focus:border-amber-400 rounded-xl px-3.5 py-2 font-bold text-stone-100 text-xs"
                        >
                          <option value={0}>0% GST (Default Excluded)</option>
                          <option value={5}>5% GST</option>
                          <option value={18}>18% GST (Standard Furniture GST)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Grand Total Highlight Box */}
                  <div className="bg-stone-800/90 border border-amber-500/30 p-4 rounded-xl space-y-1">
                    <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                      Grand Total Amount
                    </div>
                    <div className="text-2xl font-black font-mono text-amber-300 tracking-tight">
                      ₹{quoteGrandTotal.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-stone-400 italic">
                      {getAmountInWords(quoteGrandTotal)}
                    </div>
                  </div>

                  {/* Received Amount Input */}
                  <div className="space-y-1.5 pt-3 border-t border-stone-800">
                    <div className="flex justify-between items-center">
                      <label className="text-stone-300 font-bold text-xs">Received Amount (INR)</label>
                      <span className="text-emerald-400 font-mono text-xs font-bold">
                        ₹{(quoteReceivedAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-stone-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        max={quoteGrandTotal}
                        value={quoteReceivedAmount === 0 ? '' : quoteReceivedAmount}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          if (val > quoteGrandTotal) {
                            alert(`Received Amount (₹${val.toLocaleString('en-IN')}) cannot be greater than Grand Total Amount (₹${quoteGrandTotal.toLocaleString('en-IN')}).`);
                            setQuoteReceivedAmount(quoteGrandTotal);
                          } else {
                            setQuoteReceivedAmount(val);
                          }
                        }}
                        placeholder="Enter received/advance amount"
                        className="w-full bg-stone-800/90 border border-stone-700 focus:border-amber-400 rounded-xl pl-8 pr-3.5 py-2 font-mono text-stone-100 text-xs font-bold placeholder:text-stone-500 outline-none transition"
                      />
                    </div>
                    <div className="flex justify-between items-center pt-1 font-mono text-[11px]">
                      <span className="text-stone-400">Generated Document Type:</span>
                      {quoteReceivedAmount > 0 ? (
                        <span className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-black flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          INVOICE
                        </span>
                      ) : (
                        <span className="bg-stone-800 border border-stone-700 text-stone-300 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold">
                          ESTIMATE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Balance Amount Row if Received Amount > 0 */}
                  {quoteReceivedAmount > 0 && (
                    <div className="flex justify-between items-center text-rose-300 text-xs pt-2.5 border-t border-stone-800/80 font-mono font-bold">
                      <span>Balance Amount</span>
                      <span>₹{Math.max(0, quoteGrandTotal - quoteReceivedAmount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Footer Action Bar */}
            <div className="px-6 py-4 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-600 font-medium">
                  Summary:
                </span>
                <span className="text-xs font-bold text-stone-900 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                  {quoteItems.length} Product{quoteItems.length > 1 ? 's' : ''} • Grand Total: ₹{quoteGrandTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddQuoteModal(false); setEditingQuotation(null); }}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('Draft')}
                  className="px-4 py-2.5 rounded-xl border border-amber-600 text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>Save as Draft</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('Sent')}
                  className="px-5 py-2.5 rounded-xl bg-[#593622] hover:bg-[#482b1b] text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <FileCheck size={15} />
                  <span>{editingQuotation ? 'Update Price Quotation' : 'Issue Quotation'}</span>
                </button>
              </div>
            </div>
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

      {/* 5. ESTIMATE RECEIPT VIEWER MODAL */}
      {viewingEstimateQuote && (() => {
        const handleUpdateField = (field: keyof CRMQuotation, value: any) => {
          if (!viewingEstimateQuote) return;
          const updated = { ...viewingEstimateQuote, [field]: value };
          setViewingEstimateQuote(updated);
          onSaveCRMQuotation(updated);
        };

        const customer = db.crmCustomers?.find(c => c.id === viewingEstimateQuote.customer_id) || db.customers?.find(c => c.id === viewingEstimateQuote.customer_id);
        const itemsList = viewingEstimateQuote.items || [];
        const itemSubtotal = itemsList.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
        const transportationCharges = Number(viewingEstimateQuote.transportation_charges) || 0;
        const totalDiscount = (viewingEstimateQuote.discount !== undefined && Number(viewingEstimateQuote.discount) >= 0)
          ? Number(viewingEstimateQuote.discount)
          : itemsList.reduce((acc, item) => acc + (item.discount || 0), 0);
        const taxableAmount = Math.max(0, itemSubtotal + transportationCharges - totalDiscount);
        const totalGstAmount = itemsList.reduce((acc, item) => {
          const itemTaxable = Math.max(0, (item.unitPrice * item.quantity) - (item.discount || 0));
          return acc + Math.round(itemTaxable * ((item.gst || 0) / 100));
        }, 0);

        const firstItem = itemsList[0];
        const itemDiscount = firstItem ? (firstItem.discount || 0) : 0;
        const itemGstPercent = firstItem ? (firstItem.gst || 0) : 0;
        const itemGstAmount = firstItem ? Math.round(Math.max(0, (firstItem.unitPrice * firstItem.quantity) - itemDiscount) * (itemGstPercent / 100)) : 0;

        // Number to Words function
        const getAmountInWords = (num: number): string => {
          if (num === 0) return 'Zero Rupees only';
          const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
          const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
          
          const helper = (n: number): string => {
            if (n < 20) return ones[n];
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
            if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + helper(n % 100) : '');
            if (n < 100000) return helper(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + helper(n % 1000) : '');
            if (n < 10000000) return helper(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + helper(n % 100000) : '');
            return helper(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + helper(n % 10000000) : '');
          };
          
          return helper(Math.round(num)).trim() + ' Rupees Only';
        };

        const quoteDisplayId = viewingEstimateQuote.id.startsWith('QT-') ? viewingEstimateQuote.id : `QT-${viewingEstimateQuote.id}`;
        const isInvoice = (viewingEstimateQuote.received_amount || 0) > 0;
        const docTitle = isInvoice ? 'Invoice' : 'Estimate';
        const receivedAmt = Math.max(0, viewingEstimateQuote.received_amount || 0);
        const balanceAmt = Math.max(0, viewingEstimateQuote.totalAmount - receivedAmt);

        const shareText = `Hello ${customer?.name || viewingEstimateQuote.customer_name},\n\nPlease find the custom price ${docTitle} from *Bhisez Furniture*:\n\n*${docTitle} No:* ${quoteDisplayId}\n*Date:* ${formatToDDMMYYYY(viewingEstimateQuote.created_at)}\n*Item:* ${firstItem?.furnitureItem || 'Bespoke Item'}\n*Specs:* ${firstItem?.dimensions || '-'}\n*Material:* ${firstItem?.material || '-'}\n*Quantity:* ${firstItem?.quantity || 1}\n*Grand Total:* ₹${viewingEstimateQuote.totalAmount.toLocaleString('en-IN')}${receivedAmt > 0 ? `\n*Received Amount:* ₹${receivedAmt.toLocaleString('en-IN')}\n*Balance Amount:* ₹${balanceAmt.toLocaleString('en-IN')}` : ''}\n\nThank you for choosing Bhisez Furniture!`;
        const phoneForWa = customer?.phone ? customer.phone.replace(/\D/g, '') : '';
        const whatsappUrl = phoneForWa
          ? `https://api.whatsapp.com/send?phone=${phoneForWa}&text=${encodeURIComponent(shareText)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

        const handlePrintEstimate = () => {
          const printContent = document.getElementById('estimate-print-sheet');
          if (!printContent) return;
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            const htmlString = '<html><head><title>' + docTitle + '_' + quoteDisplayId + '</title>' +
              '<script src="https://cdn.tailwindcss.com"></script>' +
              '<style>' +
              '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");' +
              '@page { size: A4 portrait; margin: 8mm; }' +
              'body, * { font-family: Calibri, "Segoe UI", Arial, sans-serif !important; }' +
              'body { background-color: white; color: black; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
              '.print\\:hidden { display: none !important; }' +
              '.print\\:inline { display: inline !important; }' +
              '.print\\:block { display: block !important; }' +
              '@media print { body { padding: 0; margin: 0; } .print\\:hidden { display: none !important; } .print\\:inline { display: inline !important; } .print\\:block { display: block !important; } .page-break-before-always, .break-before-page { page-break-before: always !important; break-before: page !important; } }' +
              '.page-break-before-always, .break-before-page { page-break-before: always; break-before: page; }' +
              '</style>' +
              '</head><body onload="window.print(); setTimeout(function(){ window.close(); }, 500);">' +
              '<div class="w-full max-w-4xl mx-auto p-2" style="font-family: Calibri, \'Segoe UI\', Arial, sans-serif;">' +
              printContent.innerHTML +
              '</div></body></html>';
            printWindow.document.write(htmlString);
            printWindow.document.close();
          }
        };

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-stone-100 rounded-3xl shadow-2xl p-4 sm:p-6 w-full max-w-4xl my-8 space-y-4 max-h-[95vh] overflow-y-auto"
            >
              {/* Control Panel (Not Printed) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200">
                <div>
                  <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    {docTitle} Document Engine ({isInvoice ? 'Invoice Active' : 'Estimate Active'})
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5 font-medium">Generate, share on WhatsApp, or download standard high-fidelity A4 {docTitle} PDFs.</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#20ba59] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Share2 size={13} />
                    Share via WhatsApp
                  </a>

                  <button
                    onClick={handlePrintEstimate}
                    className="bg-[#593622] hover:bg-[#4d2f1e] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer size={13} />
                    Print / Download PDF
                  </button>

                  <button
                    onClick={() => setViewingEstimateQuote(null)}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-750 p-1.5 rounded-xl transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>



              {/* Scrollable sheet container for mobile preview */}
              <div className="overflow-x-auto bg-white p-2 rounded-3xl border border-stone-200 shadow-sm">
                <div id="estimate-print-sheet" className="min-w-[760px] bg-white text-slate-800 p-4 sm:p-6 print:p-0" style={{ fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}>
                  
                  {/* Title centered above the main box */}
                  <div className="text-center mb-3 print:mb-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-wide uppercase">{docTitle}</h1>
                  </div>

                  {/* Unified Main Box with Slate Border */}
                  <div className="border border-slate-400 bg-white">
                    
                    {/* Section 1: Company Profile Info Block */}
                    <div className="grid grid-cols-12 p-3 print:p-2 items-center">
                      <div 
                        className="col-span-5 flex flex-col items-start select-none group relative"
                        title="Company Brand Logo"
                      >
                        <img 
                          src={customLogo || companyLogoImg} 
                          alt="Company Brand Logo" 
                          className="max-h-24 sm:max-h-28 print:max-h-20 max-w-full object-contain" 
                        />
                      </div>

                      <div className="col-span-7 text-left space-y-0.5 pl-4">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-none">Bhisez furniture</h2>
                        <p className="text-[10px] sm:text-[11px] text-slate-600">Bhisez Furniture, Near Bus Stand, Sukalwad-416534</p>
                        <div className="flex flex-wrap gap-x-4 text-[10px] sm:text-[11px] text-slate-600">
                          <p>Phone: <span className="font-bold text-slate-900">8275351122</span></p>
                          <p>Email: <span className="text-slate-900 font-medium">bhisezfurniture@gmail.com</span></p>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-600">State: <span className="font-bold text-slate-900">27-Maharashtra</span></p>
                      </div>
                    </div>

                    {/* Section 2: Customer & Details Grid */}
                    <div className="grid grid-cols-2 border-t border-slate-400 divide-x divide-slate-400">
                      {/* Left Column: Customer Details */}
                      <div className="flex flex-col">
                        <div className="bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 border-b border-slate-400 flex justify-between items-center">
                          <span>{docTitle} For:</span>
                          <span className="text-[10px] font-bold text-slate-800">
                            {docTitle} Ref: <span className="text-[#593622] font-black">{quoteDisplayId}</span>
                          </span>
                        </div>
                        <div className="p-2.5 print:p-2 space-y-0.5 min-h-[55px] text-xs text-slate-700">
                          <h3 className="font-bold text-slate-900 text-sm">{customer?.name || viewingEstimateQuote.customer_name}</h3>
                          <p className="text-[11px] font-bold text-slate-700">
                            {docTitle} Ref: <span className="text-[#593622] font-extrabold">{quoteDisplayId}</span>
                          </p>
                          {customer && (
                            <div className="space-y-0.5 text-slate-600 text-[11px]">
                              <p>Contact: <span className="font-semibold text-slate-800">{customer.phone}</span></p>
                              {customer.address && (
                                <p className="leading-snug">
                                  Address: {customer.address}{'city' in customer && customer.city ? `, ${customer.city}` : ''}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Document Details */}
                      <div className="flex flex-col">
                        <div className="bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 border-b border-slate-400 uppercase tracking-wide flex justify-between items-center">
                          <span>{docTitle} Details:</span>
                          <span className="text-[9px] text-[#593622] font-normal normal-case print:hidden italic">(Click values to edit inline)</span>
                        </div>
                        <div className="p-2.5 print:p-2 text-[11px] text-slate-700 space-y-1 min-h-[55px]">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-600">No:</span>
                            <span className="hidden print:inline font-bold text-slate-900">
                              {viewingEstimateQuote.estimateNo !== undefined ? viewingEstimateQuote.estimateNo : (viewingEstimateQuote.id ? viewingEstimateQuote.id.toString().replace(/\D/g, '').slice(-3) || '1' : '1')}
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={viewingEstimateQuote.estimateNo !== undefined ? viewingEstimateQuote.estimateNo : (viewingEstimateQuote.id ? Number(viewingEstimateQuote.id.toString().replace(/\D/g, '')) || 1 : 1)}
                              onChange={(e) => handleUpdateField('estimateNo', Number(e.target.value))}
                              className="print:hidden font-bold text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-amber-50/50 border border-transparent hover:border-dashed hover:border-slate-300 focus:border-amber-450 rounded px-1.5 py-0.5 text-[11px] w-20 outline-none transition"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-slate-600">Date:</span>
                            <span className="hidden print:inline font-bold text-slate-900">
                              {formatToDDMMYYYY(viewingEstimateQuote.created_at)}
                            </span>
                            <input
                              type="date"
                              value={new Date(viewingEstimateQuote.created_at).toISOString().split('T')[0]}
                              onChange={(e) => handleUpdateField('created_at', new Date(e.target.value + 'T12:00:00').toISOString())}
                              className="print:hidden font-bold text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-amber-50/50 border border-transparent hover:border-dashed hover:border-slate-300 focus:border-amber-450 rounded px-1.5 py-0.5 text-[11px] w-28 outline-none transition"
                            />
                          </div>

                          <p className="flex items-center gap-1">
                            <span className="text-slate-600">Place of Supply:</span>
                            <span className="font-bold text-slate-900">27-Maharashtra</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Itemized Table */}
                    <div className="border-t border-slate-400 overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-400 text-[10px] text-slate-700 font-bold uppercase">
                            <th className="p-2 w-12 border-r border-slate-400 text-center">#</th>
                            <th className="p-2 border-r border-slate-400">Item Name</th>
                            <th className="p-2 w-24 border-r border-slate-400 text-center">HSN/ SAC</th>
                            <th className="p-2 w-20 border-r border-slate-400 text-center">Quantity</th>
                            <th className="p-2 w-28 border-r border-slate-400 text-right">Price/ Unit (₹)</th>
                            <th className="p-2 w-28 text-right font-bold text-right pr-2">Amount(₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-400 text-slate-800">
                          {itemsList.length > 0 ? (
                            itemsList.map((item, idx) => {
                              const itemTotalVal = (item.unitPrice * item.quantity);
                              return (
                                <tr key={item.id} className="divide-x divide-slate-400 text-[11px]">
                                  <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                                  <td className="p-2 font-medium">
                                    <div className="font-bold text-slate-900">{item.furnitureItem}</div>
                                    {(item.dimensions || item.material) && (
                                      <div className="text-[10px] text-slate-500 space-x-2 mt-0.5">
                                        {item.dimensions && <span>Size: <span className="text-slate-700">{item.dimensions}</span></span>}
                                        {item.material && <span>Wood: <span className="text-slate-700">{item.material}</span></span>}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2 text-center text-slate-400">-</td>
                                  <td className="p-2 text-center font-bold text-slate-900">{item.quantity}</td>
                                  <td className="p-2 text-right">₹{item.unitPrice.toLocaleString('en-IN')}.00</td>
                                  <td className="p-2 text-right font-bold text-slate-900 pr-2">₹{itemTotalVal.toLocaleString('en-IN')}.00</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr className="divide-x divide-slate-400 text-[11px]">
                              <td className="p-2 text-center text-slate-500">1</td>
                              <td className="p-2 font-bold text-slate-900">Custom Furniture Crafting</td>
                              <td className="p-2 text-center text-slate-400">-</td>
                              <td className="p-2 text-center font-bold text-slate-900">1</td>
                              <td className="p-2 text-right">₹{viewingEstimateQuote.totalAmount.toLocaleString('en-IN')}.00</td>
                              <td className="p-2 text-right font-bold text-slate-900 pr-2">₹{viewingEstimateQuote.totalAmount.toLocaleString('en-IN')}.00</td>
                            </tr>
                          )}

                          {/* Total Row */}
                          <tr className="divide-x divide-slate-400 bg-slate-50/50 font-bold border-t border-slate-400 text-[11px]">
                            <td className="p-2 text-center"></td>
                            <td className="p-2 text-slate-900">Total</td>
                            <td className="p-2 text-center"></td>
                            <td className="p-2 text-center text-slate-900">
                              {itemsList.reduce((acc, curr) => acc + curr.quantity, 0) || 1}
                            </td>
                            <td className="p-2"></td>
                            <td className="p-2 text-right text-slate-900 pr-2">
                              ₹{itemSubtotal.toLocaleString('en-IN')}.00
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Section 3.5: Breakdown Calculations Layout */}
                    <div className="grid grid-cols-12 border-t border-slate-400">
                      <div className="col-span-8 border-r border-slate-400 bg-white min-h-[30px] print:min-h-0"></div>
                      <div className="col-span-4 flex flex-col font-medium text-xs divide-y divide-slate-400">
                        <div className="grid grid-cols-2 p-1.5 print:p-1 text-slate-700">
                          <span className="font-semibold text-slate-800">Subtotal</span>
                          <span className="text-right font-bold pr-1">: ₹{itemSubtotal.toLocaleString('en-IN')}.00</span>
                        </div>

                        {transportationCharges > 0 && (
                          <div className="grid grid-cols-2 p-1.5 print:p-1 text-emerald-950 bg-emerald-50/40">
                            <span className="font-semibold text-emerald-950 flex items-center gap-1">
                              Transportation Charges
                            </span>
                            <span className="text-right font-bold text-emerald-900 pr-1">: +₹{transportationCharges.toLocaleString('en-IN')}.00</span>
                          </div>
                        )}

                        {totalDiscount > 0 && (
                          <div className="grid grid-cols-2 p-1.5 print:p-1 text-rose-800 bg-rose-50/20">
                            <span className="font-semibold text-rose-950">Discount</span>
                            <span className="text-right font-bold pr-1">: -₹{totalDiscount.toLocaleString('en-IN')}.00</span>
                          </div>
                        )}

                        {(totalDiscount > 0 || totalGstAmount > 0 || transportationCharges > 0) && (
                          <div className="grid grid-cols-2 p-1.5 print:p-1 text-slate-600">
                            <span>Taxable Value</span>
                            <span className="text-right font-bold text-slate-800 pr-1">: ₹{taxableAmount.toLocaleString('en-IN')}.00</span>
                          </div>
                        )}
                        
                        {totalGstAmount > 0 && (
                          <div className="grid grid-cols-2 p-1.5 print:p-1">
                            <span className="text-slate-600">GST</span>
                            <span className="text-right font-bold text-slate-900 pr-1">: +₹{totalGstAmount.toLocaleString('en-IN')}.00</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 p-1.5 print:p-1 font-bold text-slate-950 bg-slate-50/50">
                          <span>Grand Total</span>
                          <span className="text-right font-extrabold text-slate-950 pr-1">: ₹{viewingEstimateQuote.totalAmount.toLocaleString('en-IN')}.00</span>
                        </div>

                        {receivedAmt > 0 && (
                          <>
                            <div className="grid grid-cols-2 p-1.5 print:p-1 font-bold text-emerald-900 bg-emerald-50/40">
                              <span className="text-emerald-950 font-bold">Received Amount</span>
                              <span className="text-right font-extrabold text-emerald-900 pr-1">: ₹{receivedAmt.toLocaleString('en-IN')}.00</span>
                            </div>
                            <div className="grid grid-cols-2 p-1.5 print:p-1 font-bold text-rose-900 bg-rose-50/30">
                              <span className="text-rose-950 font-bold">Balance Amount</span>
                              <span className="text-right font-extrabold text-rose-900 pr-1">: ₹{balanceAmt.toLocaleString('en-IN')}.00</span>
                            </div>
                          </>
                        )}

                        {/* Amount In Words Sub-Header */}
                        <div className="bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border-t border-b border-slate-400 uppercase">
                          {docTitle} Amount In Words :
                        </div>
                        
                        {/* Amount text */}
                        <div className="p-1.5 print:p-1 text-[11px] leading-relaxed text-slate-800 font-semibold bg-white italic">
                          {getAmountInWords(viewingEstimateQuote.totalAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Description & Terms */}
                    <div className="grid grid-cols-2 border-t border-slate-400 divide-x divide-slate-400 text-xs">
                      <div className="flex flex-col">
                        <div className="bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 border-b border-slate-400 uppercase tracking-wide flex justify-between items-center">
                          <span>Description:</span>
                          <span className="text-[9px] text-[#593622] font-normal normal-case print:hidden italic">(Click below to edit description)</span>
                        </div>
                        <div className="p-2 print:p-1.5 text-slate-700 font-semibold min-h-[40px] print:min-h-[25px] flex flex-col flex-1">
                          <span className="hidden print:inline whitespace-pre-wrap leading-relaxed text-slate-700">
                            {viewingEstimateQuote.description !== undefined ? viewingEstimateQuote.description : (viewingEstimateQuote.notes || '')}
                          </span>
                          <textarea
                            placeholder="Type custom description manually..."
                            value={viewingEstimateQuote.description !== undefined ? viewingEstimateQuote.description : (viewingEstimateQuote.notes || '')}
                            onChange={(e) => handleUpdateField('description', e.target.value)}
                            className="print:hidden w-full flex-1 bg-transparent hover:bg-slate-100 focus:bg-amber-50/50 border border-transparent hover:border-dashed hover:border-slate-300 focus:border-amber-450 rounded px-1.5 py-1 text-xs font-semibold outline-none resize-none min-h-[40px] transition text-slate-700"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <div className="bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 border-b border-slate-400 uppercase tracking-wide flex justify-between items-center">
                          <span>Terms And Conditions:</span>
                          <span className="text-[9px] text-[#593622] font-normal normal-case print:hidden italic">(Click below to edit terms)</span>
                        </div>
                        <div className="p-2 print:p-1.5 text-slate-500 font-medium min-h-[40px] print:min-h-[25px] flex flex-col flex-1">
                          <span className="hidden print:inline whitespace-pre-wrap leading-relaxed text-slate-500">
                            {viewingEstimateQuote.termsAndConditions !== undefined ? viewingEstimateQuote.termsAndConditions : ''}
                          </span>
                          <textarea
                            placeholder="Type terms & conditions manually..."
                            value={viewingEstimateQuote.termsAndConditions !== undefined ? viewingEstimateQuote.termsAndConditions : ''}
                            onChange={(e) => handleUpdateField('termsAndConditions', e.target.value)}
                            className="print:hidden w-full flex-1 bg-transparent hover:bg-slate-100 focus:bg-amber-50/50 border border-transparent hover:border-dashed hover:border-slate-300 focus:border-amber-450 rounded px-1.5 py-1 text-xs font-medium outline-none resize-none min-h-[40px] transition text-slate-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Bank Details & Signature Row */}
                    <div className="grid grid-cols-2 border-t border-slate-400 divide-x divide-slate-400 text-xs">
                      <div className="flex flex-col">
                        <div className="bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 border-b border-slate-400 uppercase tracking-wide">
                          Bank Details:
                        </div>
                        <div className="p-2.5 print:p-2 grid grid-cols-12 gap-2 items-center min-h-[95px] print:min-h-[85px]">
                          <div className="col-span-7 space-y-0.5 text-[11px] text-slate-700 font-semibold">
                            <p>Bank Name: <span className="text-slate-900 font-bold">Hdfc Bank, Malwan</span></p>
                            <p>Account No.: <span className="text-slate-900 font-extrabold">50100705616156</span></p>
                            <p>IFSC code: <span className="text-slate-900 font-extrabold">HDFC0009348</span></p>
                            <p>Account Holder's Name: <span className="text-slate-900 font-bold">Aaradhya Mandar Bhise</span></p>
                          </div>
                          <div 
                            className="col-span-5 flex flex-col items-center justify-center border-l border-slate-200 pl-2 group relative"
                            title="UPI QR Code Image"
                          >
                            <img 
                              src={customQR || upiQrImg} 
                              alt="UPI QR Code Image" 
                              className="w-24 h-24 sm:w-28 sm:h-28 print:w-20 print:h-20 object-contain" 
                            />
                            <div className="mt-1 bg-[#1b9a59] text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-center select-none print:bg-emerald-600">
                              UPI Click to Pay
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <div className="bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 border-b border-slate-400 uppercase tracking-wide font-sans">
                          For Bhisez furniture:
                        </div>
                        <div 
                          className="p-2.5 print:p-2 flex flex-col items-center justify-end flex-1 min-h-[95px] print:min-h-[85px] group relative"
                          title="Authorized Signatory Signature"
                        >
                          <div className="relative w-44 sm:w-52 h-16 sm:h-20 print:w-48 print:h-18 flex items-center justify-center">
                            <img 
                              src={customSignature || signatureImg} 
                              alt="Authorized Signatory Signature" 
                              className="max-w-full max-h-full object-contain" 
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold mt-1 font-sans">Authorized Signatory</span>
                        </div>
                      </div>
                    </div>

                    {/* NEW PAGE: PRODUCT VISUAL GALLERY / ATTACHMENTS */}
                    <div className="break-before-page print:break-before-page page-break-before-always pt-6 print:pt-0 mt-6 print:mt-0 border-t-2 border-dashed border-slate-300 print:border-none space-y-4">
                      {/* Products Gallery 2-Column Grid */}
                      {(() => {
                        // Build list of active image slots
                        const activeSlots: Array<{
                          item: typeof itemsList[0];
                          imgSrc?: string;
                          itemIdx: number;
                          photoIdx?: number;
                        }> = [];

                        itemsList.forEach((item, idx) => {
                          const images = item.images || [];
                          if (images.length > 0) {
                            images.forEach((imgSrc, imgI) => {
                              activeSlots.push({ item, imgSrc, itemIdx: idx, photoIdx: imgI });
                            });
                          } else {
                            activeSlots.push({ item, itemIdx: idx });
                          }
                        });

                        // Ensure total slots is a multiple of 2 (at least 4)
                        const targetTotal = Math.max(4, Math.ceil(activeSlots.length / 2) * 2);
                        const totalSlots: Array<typeof activeSlots[0] | null> = [...activeSlots];
                        while (totalSlots.length < targetTotal) {
                          totalSlots.push(null);
                        }

                        return (
                          <div className="grid grid-cols-2 gap-4 print:gap-4 pt-1">
                            {totalSlots.map((slot, slotI) => {
                              if (slot) {
                                return (
                                  <div
                                    key={slotI}
                                    className="border border-slate-300 bg-white rounded-2xl p-3.5 flex flex-col justify-between min-h-[280px] sm:min-h-[310px] shadow-2xs page-break-inside-avoid print:page-break-inside-avoid"
                                  >
                                    {/* Top Header bar */}
                                    <div>
                                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                          <span className="bg-[#593622] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
                                            PRODUCT #{slot.itemIdx + 1}
                                          </span>
                                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                            {slot.item.furnitureItem || `Product #${slot.itemIdx + 1}`}
                                          </h4>
                                        </div>
                                        {slot.item.quantity && (
                                          <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">
                                            Qty: {slot.item.quantity}
                                          </span>
                                        )}
                                      </div>

                                      {/* Specs info */}
                                      {(slot.item.material || slot.item.dimensions) && (
                                        <div className="text-[10px] text-slate-600 font-medium pt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                          {slot.item.material && <span>Wood: <strong className="text-slate-800">{slot.item.material}</strong></span>}
                                          {slot.item.dimensions && <span>Size: <strong className="text-slate-800">{slot.item.dimensions}</strong></span>}
                                        </div>
                                      )}
                                    </div>

                                    {/* Centered Image Container */}
                                    <div className="w-full flex-1 my-2 bg-slate-50/70 rounded-xl border border-slate-200 flex items-center justify-center p-2 min-h-[160px] max-h-[220px] overflow-hidden">
                                      {slot.imgSrc ? (
                                        <img
                                          src={slot.imgSrc}
                                          alt={`${slot.item.furnitureItem} - Photo ${(slot.photoIdx ?? 0) + 1}`}
                                          className="max-w-full max-h-[180px] object-contain rounded-md"
                                        />
                                      ) : (
                                        <span className="text-slate-300 font-mono text-xs italic">[No Image Attached]</span>
                                      )}
                                    </div>

                                    {/* Bottom Footer Label */}
                                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-700 font-medium">
                                      <span className="font-bold text-slate-900 truncate max-w-[170px]">
                                        {slot.item.furnitureItem}
                                      </span>
                                      <span className="text-slate-500 text-[10px] font-semibold">
                                        {slot.photoIdx !== undefined ? `Photo ${slot.photoIdx + 1}` : 'Product Reference'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              } else {
                                return (
                                  <div
                                    key={slotI}
                                    className="border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/30 flex flex-col items-center justify-center text-slate-300 font-mono text-xs italic min-h-[280px] sm:min-h-[310px] shadow-2xs select-none page-break-inside-avoid print:page-break-inside-avoid"
                                  >
                                    <span>[Intentionally Left Blank]</span>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        );
                      })()}
                    </div>

                  </div>



                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* GLOBAL FULL-SCREEN IMAGE LIGHTBOX MODAL */}
      {previewImageModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImageModalUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-stone-900 border border-stone-700 rounded-2xl p-2 shadow-2xl flex flex-col items-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-2.5 border-b border-stone-800">
              <span className="text-xs font-bold font-mono text-stone-300 flex items-center gap-2">
                <Image size={14} className="text-amber-400" />
                Quotation Product Photo Inspection
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImageModalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                >
                  Open High-Res
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImageModalUrl(null)}
                  className="p-1.5 bg-stone-800 hover:bg-rose-600 text-white rounded-lg transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-3 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={previewImageModalUrl}
                alt="Quotation Full View"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
