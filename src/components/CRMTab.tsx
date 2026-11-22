/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import companyLogoImg from '../assets/images/logo.png';
import signatureImg from '../assets/images/Authorized Signatory.png';
import upiQrImg from '../assets/images/UPI QR code.jpeg';
import { buildUPIPaymentString, generateUPIQRCodeDataUrl, getUPIQRCodeUrl, launchGooglePay, UPI_CONFIG } from '../config';
import { UPISettingsModal } from './UPISettingsModel';
import { GooglePayModal } from './GooglePayModal';
import { 
  AppState,
  generateArticleNumber
} from '../db/store';
import { compareOrdersByArticleSerialDesc, resolveQuotationCustomer, compareCRMCustomersDesc } from '../utils';
import { 
  User, 
  CRMCustomer, 
  CRMQuotation, 
  CRMQuotationItem, 
  CRMQuotationPhoto,
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
  Image as ImageIcon,
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
  RefreshCw,
  Receipt,
  PieChart as PieChartIcon,
  Filter,
  Crown,
  Info,
  Send,
  History,
  ExternalLink,
  Check,
  ChevronDown,
  ChevronLeft
} from 'lucide-react';
import {
  EnrichedQuotation,
  QuotationAmountRange,
  QuotationDatePreset,
  QuotationSortBy,
  QuotationStatusTab,
  QuotationValidityFilter,
  buildQuotationsCSV,
  computeQuotationTabCounts,
  enrichQuotationRecord,
  filterAndSortQuotations,
  formatShortDateLabel,
  getQuotationPaymentDisplay,
} from './quotationHelpers';

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
  crmAction?: 'add-customer' | 'new-quotation' | 'invoiced-all' | 'invoiced-received' | 'invoiced-due' | null;
  onResetCrmAction?: () => void;
  onResequenceCRMCustomers?: () => { changesCount: number; idMapping: Record<string, string> };
  onViewOrder?: (orderId: string) => void;
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
  onResequenceCRMCustomers,
  onViewOrder,
}: CRMTabProps) {
  const initialSearchParams = React.useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const [subTab, setSubTab] = React.useState<'dashboard' | 'customers' | 'quotations' | 'followups'>(() => {
    const param = initialSearchParams.get('crmTab');
    if (param === 'customers' || param === 'quotations' || param === 'followups' || param === 'dashboard') {
      return param;
    }
    return 'dashboard';
  });
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);

  function generateCRMCustomerId(allCustomers: CRMCustomer[]): string {
    const d = new Date();
    const yy = d.getFullYear().toString().slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `CRM-${yy}-${mm}-`;

    let maxSerial = 0;
    const currentMonthCustomers = (allCustomers || []).filter(c => c && c.id && c.id.startsWith(prefix));

    currentMonthCustomers.forEach((c) => {
      const serialPart = c.id.substring(prefix.length);
      const serialNum = parseInt(serialPart, 10);
      if (!isNaN(serialNum)) {
        // Skip outlier jump numbers (> count + 20) to ensure continuous sequencing
        if (currentMonthCustomers.length < 100 && serialNum > currentMonthCustomers.length + 20) {
          // ignore outlier
        } else if (serialNum > maxSerial) {
          maxSerial = serialNum;
        }
      }
    });

    if (currentMonthCustomers.length > maxSerial) {
      maxSerial = currentMonthCustomers.length;
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
    const list: Array<{ id: string; name: string; phone?: string; city?: string; productRequirement?: string; status?: string; created_at?: string }> = [];
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
          status: c.status,
          created_at: c.created_at
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
          status: 'Customer',
          created_at: c.created_at
        });
      }
    });

    return list.sort(compareCRMCustomersDesc);
  }, [db.crmCustomers, db.customers]);

  const openedQuoteModalInstanceRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (showAddQuoteModal) {
      const currentInstanceKey = editingQuotation ? `edit_${editingQuotation.id}` : `new_${selectedCustomerId || 'default'}`;
      if (openedQuoteModalInstanceRef.current === currentInstanceKey) {
        // Modal is already open and initialized for this quotation session.
        // Do NOT overwrite user modifications or uploaded images when background database syncs occur!
        return;
      }
      openedQuoteModalInstanceRef.current = currentInstanceKey;

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
              images: (item.images || []).map((img: any) => {
                if (typeof img === 'string') {
                  return { url: img, description: '' };
                }
                return {
                  url: img?.url || '',
                  description: img?.description || ''
                };
              }).filter((img: CRMQuotationPhoto) => Boolean(img.url))
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
        setQuotePaymentTerms(editingQuotation.paymentTerms || '50% Advance on order confirmation, 50% before dispatch post-QC inspection.');
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
        setQuotePaymentTerms('50% Advance on order confirmation, 50% before dispatch post-QC inspection.');
        setQuoteDeliveryTerms('Ex-workshop dispatch / Transport charges extra at actuals.');
        setQuoteNotes('');
        setQuoteReceivedAmount(0);
      }
    } else {
      openedQuoteModalInstanceRef.current = null;
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
  }, [showAddQuoteModal, editingQuotation]);

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
          const img = new window.Image();
          img.onload = () => {
            try {
              if (!img.naturalWidth || !img.naturalHeight) {
                resolve(rawDataUrl.length <= 750000 ? rawDataUrl : '');
                return;
              }
              const canvas = document.createElement('canvas');
              let width = img.naturalWidth || img.width || 800;
              let height = img.naturalHeight || img.height || 600;
              const maxDim = 800;
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
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                let compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
                // If base64 length is still large (>80KB ~110,000 chars), compress further to 600px @ 0.50
                if (compressedDataUrl.length > 110000) {
                  const scale = Math.min(1, 600 / Math.max(width, height));
                  const w2 = Math.max(1, Math.round(width * scale));
                  const h2 = Math.max(1, Math.round(height * scale));
                  const canvas2 = document.createElement('canvas');
                  canvas2.width = w2;
                  canvas2.height = h2;
                  const ctx2 = canvas2.getContext('2d');
                  if (ctx2) {
                    ctx2.fillStyle = '#ffffff';
                    ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
                    ctx2.drawImage(img, 0, 0, w2, h2);
                    compressedDataUrl = canvas2.toDataURL('image/jpeg', 0.50);
                  }
                }
                resolve(compressedDataUrl || (rawDataUrl.length <= 750000 ? rawDataUrl : ''));
              } else {
                resolve(rawDataUrl.length <= 750000 ? rawDataUrl : '');
              }
            } catch {
              resolve(rawDataUrl.length <= 750000 ? rawDataUrl : '');
            }
          };
          img.onerror = () => resolve(rawDataUrl.length <= 750000 ? rawDataUrl : '');
          img.src = rawDataUrl;
        } catch {
          resolve(rawDataUrl.length <= 750000 ? rawDataUrl : '');
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
      const newPhotoObjects: CRMQuotationPhoto[] = [];
      for (const file of filesArray) {
        const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic|bmp|svg)$/i.test(file.name);
        if (isImg) {
          const compressed = await compressAndReadFile(file);
          if (compressed) {
            newPhotoObjects.push({ url: compressed, description: '' });
          }
        }
      }
      if (newPhotoObjects.length > 0) {
        setQuoteItems(prev => prev.map((item, i) => {
          if (i === idx) {
            return {
              ...item,
              images: [...(item.images || []), ...newPhotoObjects]
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

  const handleUpdateItemPhotoDescription = (itemIdx: number, imgIdx: number, description: string) => {
    setQuoteItems(prev => prev.map((item, i) => {
      if (i === itemIdx) {
        const currentImages = item.images || [];
        const updatedImages = currentImages.map((img: any, imI: number) => {
          if (imI === imgIdx) {
            const url = typeof img === 'string' ? img : (img?.url || '');
            return { url, description };
          }
          if (typeof img === 'string') {
            return { url: img, description: '' };
          }
          return img;
        });
        return {
          ...item,
          images: updatedImages
        };
      }
      return item;
    }));
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
  const [customUPIId, setCustomUPIId] = React.useState<string>(() => localStorage.getItem('estimate_custom_upi_id') || '');
  const [customPayeeName, setCustomPayeeName] = React.useState<string>(() => localStorage.getItem('estimate_custom_payee_name') || '');
  const [showUPISettingsModal, setShowUPISettingsModal] = React.useState(false);
  const [showGooglePayModal, setShowGooglePayModal] = React.useState(false);
  const [generatedQRDataUrl, setGeneratedQRDataUrl] = React.useState<string>('');
  const [copiedUPI, setCopiedUPI] = React.useState(false);

  // Generate dynamic client-side high-contrast QR Data URL whenever active quote or UPI settings change
  React.useEffect(() => {
    if (!viewingEstimateQuote) return;
    const activeQ = db.crmQuotations?.find(q => q.id === viewingEstimateQuote.id) || viewingEstimateQuote;
    const quoteDisplayId = activeQ.id.startsWith('QT-') ? activeQ.id : `QT-${activeQ.id}`;
    const receivedAmt = Math.max(0, activeQ.received_amount || 0);
    const balanceAmt = Math.max(0, activeQ.totalAmount - receivedAmt);

    const upiString = buildUPIPaymentString({
      amount: balanceAmt,
      invoiceRef: quoteDisplayId,
      upiId: customUPIId || undefined,
      payeeName: customPayeeName || undefined,
    });

    generateUPIQRCodeDataUrl(upiString, { width: 280, margin: 2 })
      .then((dataUrl) => {
        setGeneratedQRDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Failed to generate local QR Data URL:', err);
      });
  }, [
    viewingEstimateQuote?.id,
    viewingEstimateQuote?.totalAmount,
    viewingEstimateQuote?.received_amount,
    customUPIId,
    customPayeeName,
    db.crmQuotations
  ]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const baseName = file.name.split('.').slice(0, -1).join('.') || file.name;
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name);

    if (isImage) {
      const compressed = await compressAndReadFile(file);
      if (!compressed) {
        alert('This image could not be compressed safely for storage. Please choose a smaller image file.');
        return;
      }
      setAttachFileName(baseName);
      setUploadedFileData(compressed);
      setCapturedImage(null);
      return;
    }

    if (file.size > 700 * 1024) {
      alert('Selected document is larger than 700 KB and cannot be stored inline in Firestore. Please upload a smaller PDF/drawing.');
      return;
    }

    setAttachFileName(baseName);
    const reader = new FileReader();
    reader.onload = (event) => {
      const raw = (event.target?.result as string) || '';
      if (raw.length > 950000) {
        alert('Encoded file exceeds the safe database size limit. Please choose a smaller file.');
        return;
      }
      setUploadedFileData(raw);
      setCapturedImage(null); // Clear camera capture if they upload a file
    };
    reader.readAsDataURL(file);
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
  const [quoteSearch, setQuoteSearch] = React.useState(() => initialSearchParams.get('qSearch') || '');
  const [custViewMode, setCustViewMode] = React.useState<'grid' | 'table'>('table');
  const [custFilter, setCustFilter] = React.useState<'all' | 'active_leads' | 'repeat' | 'vip' | 'closed_won' | 'closed_lost'>('all');
  const [showFilterDrawer, setShowFilterDrawer] = React.useState(false);
  const [custSortBy, setCustSortBy] = React.useState<
    'recent_activity' | 'newest_registered' | 'id_desc' | 'name_asc' | 'budget_desc' | 'orders_desc' | 'revenue_desc'
  >('recent_activity');
  const [custPage, setCustPage] = React.useState(1);
  const [custPageSize, setCustPageSize] = React.useState<number>(10);

  // Advanced Filter Drawer States (11 operational criteria)
  const [advStatus, setAdvStatus] = React.useState<string>('all');
  const [advCustomerType, setAdvCustomerType] = React.useState<string>('all');
  const [advPaymentStatus, setAdvPaymentStatus] = React.useState<string>('all');
  const [advSource, setAdvSource] = React.useState<string>('all');
  const [advCity, setAdvCity] = React.useState<string>('all');
  const [advBudgetRange, setAdvBudgetRange] = React.useState<string>('all');
  const [advRegDatePreset, setAdvRegDatePreset] = React.useState<string>('all');
  const [advRegStartDate, setAdvRegStartDate] = React.useState<string>('');
  const [advRegEndDate, setAdvRegEndDate] = React.useState<string>('');
  const [advProductReq, setAdvProductReq] = React.useState<string>('');
  const [advOrderCount, setAdvOrderCount] = React.useState<string>('all');
  const [advContactMethod, setAdvContactMethod] = React.useState<string>('all');
  const [advFollowUpStatus, setAdvFollowUpStatus] = React.useState<string>('all');

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

  // React on quick crm actions triggered externally (including Dashboard financial cards)
  React.useEffect(() => {
    if (!crmAction) return;
    if (crmAction === 'add-customer' && hasWriteAccess) {
      setSubTab('customers');
      setEditingCustomer(null);
      setShowAddCustModal(true);
    } else if (crmAction === 'new-quotation' && hasWriteAccess) {
      setSubTab('quotations');
      setEditingQuotation(null);
      setShowAddQuoteModal(true);
    } else if (
      crmAction === 'invoiced-all' ||
      crmAction === 'invoiced-received' ||
      crmAction === 'invoiced-due'
    ) {
      setSelectedCustomerId(null);
      setSubTab('quotations');
      setQuoteStatusTab('invoiced');
      setQuoteSortBy('highest_value');
      setShowQuoteAdvFilters(true);
      setQuoteAdvQuoteStatus('INVOICED');
      setQuoteAdvInvoiceStatus(
        crmAction === 'invoiced-received'
          ? 'received_amount'
          : crmAction === 'invoiced-due'
          ? 'balance_amount'
          : 'all'
      );
      setQuoteSearch('');
      setQuoteDatePreset('all');
      setQuoteCustomStartDate('');
      setQuoteCustomEndDate('');
      setQuoteValidityFilter('all');
      setQuoteAmountRange('all');
      setQuoteCustomMinAmt('');
      setQuoteCustomMaxAmt('');
      setQuoteAdvProductionStatus('all');
      setQuotePage(1);
    }
    if (onResetCrmAction) {
      onResetCrmAction();
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
      if (custQuotes.some(q => q.status === 'Approved' || q.status === 'INVOICED' || q.status === 'Invoiced')) {
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
      case 'New Inquiry':
      case 'New Lead': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Quotation Pending':
      case 'Contacted': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Quotation Sent':
      case 'Quote Sent': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Follow-up':
      case 'Qualified': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Order Confirmed':
      case 'Closed Won': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Production': return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'Delivered': return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'Disqualified':
      case 'Deal Lost':
      case 'Cancelled': return 'bg-stone-100 text-stone-600 border-stone-200';
      default: return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  const getDirectoryStatusMeta = (status: string): { label: string; badgeClass: string; dotClass: string } => {
    switch (status) {
      case 'Quotation Sent':
      case 'Quote Sent':
        return { label: 'Quote Sent', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80', dotClass: 'bg-blue-500' };
      case 'Order Confirmed':
      case 'Closed Won':
        return { label: 'Closed Won', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dotClass: 'bg-emerald-500' };
      case 'In Production':
        return { label: 'In Production', badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200/80', dotClass: 'bg-cyan-500' };
      case 'Delivered':
        return { label: 'Delivered', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', dotClass: 'bg-emerald-600' };
      case 'Follow-up':
      case 'Qualified':
        return { label: 'Follow-up', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80', dotClass: 'bg-amber-500' };
      case 'Quotation Pending':
      case 'Contacted':
        return { label: 'Quote Pending', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80', dotClass: 'bg-amber-500' };
      case 'Disqualified':
      case 'Deal Lost':
      case 'Cancelled':
        return { label: 'Closed Lost', badgeClass: 'bg-stone-100 text-stone-600 border-stone-200', dotClass: 'bg-stone-400' };
      default:
        return { label: status || 'New Inquiry', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/80', dotClass: 'bg-orange-500' };
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
          wood_schedule_status: 'Pending',
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
        wood_schedule_status: 'Pending',
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

    const rawPhone = String(formData.get('phone') || '').trim();
    const rawName = String(formData.get('name') || '').trim();

    // Prevent duplicate customer creation by checking existing mobile numbers
    if (!editingCustomer && rawPhone) {
      const normalizedDigits = rawPhone.replace(/\D/g, '').slice(-10);
      const duplicate = (db.crmCustomers || []).find((c) => {
        if (!c || !c.phone) return false;
        const cDigits = String(c.phone).replace(/\D/g, '').slice(-10);
        return (normalizedDigits.length >= 10 && cDigits === normalizedDigits) ||
          c.phone.trim().toLowerCase() === rawPhone.toLowerCase();
      });

      if (duplicate) {
        alert(`Duplicate prevented: "${duplicate.name}" (${duplicate.id}) already uses phone number ${rawPhone}. Opening existing profile instead.`);
        setShowAddCustModal(false);
        setEditingCustomer(null);
        setSubTab('customers');
        setSelectedCustomerId(duplicate.id);
        return;
      }
    }

    const custId = editingCustomer ? editingCustomer.id : generateCRMCustomerId(db.crmCustomers || []);
    const emailVal = String(formData.get('email') || '').trim();
    const prefContact = (formData.get('preferredContactMethod') as 'Phone' | 'WhatsApp' | 'Email') || editingCustomer?.preferredContactMethod || 'WhatsApp';

    const newCust: CRMCustomer = {
      id: custId,
      name: rawName,
      phone: rawPhone,
      email: emailVal || editingCustomer?.email || undefined,
      productRequirement: (formData.get('productRequirement') as string)?.trim() || undefined,
      address: (formData.get('address') as string)?.trim() || undefined,
      city: (formData.get('city') as string)?.trim() || undefined,
      state: (formData.get('state') as string)?.trim() || undefined,
      pinCode: (formData.get('pinCode') as string)?.trim() || undefined,
      source: (formData.get('source') as any) || 'Walkin',
      budget: formData.get('budget') ? Number(formData.get('budget')) : undefined,
      timeline: (formData.get('timeline') as string)?.trim() || undefined,
      status: (formData.get('status') as any) || 'New Inquiry',
      notes: (formData.get('notes') as string)?.trim() || undefined,
      preferredContactMethod: prefContact,
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

    if (showAddQuoteModal) {
      setQuoteCustomerId(newCust.id);
      if (newCust.productRequirement && quoteItems.length === 1 && !quoteItems[0].furnitureItem) {
        setQuoteItems([{ ...quoteItems[0], furnitureItem: newCust.productRequirement }]);
      }
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

  const handleGenerateInvoiceForQuotation = (quote: CRMQuotation) => {
    if (!hasWriteAccess) return;

    const updatedQuote: CRMQuotation = {
      ...quote,
      status: 'INVOICED',
      received_amount: (Number(quote.received_amount) || 0) > 0 ? quote.received_amount : 0
    };
    onSaveCRMQuotation(updatedQuote);

    // Add Timeline Event
    const timelineEvent: CRMTimelineEvent = {
      id: generateId('evt'),
      customer_id: quote.customer_id,
      type: 'quotation_approved',
      title: 'Invoice Generated',
      description: `Invoice generated for Quotation ${quote.id}. Total: ₹${(quote.totalAmount ?? 0).toLocaleString('en-IN')}. Status set to INVOICED. "Approve & Convert" is now enabled.`,
      timestamp: new Date().toISOString(),
      operator: currentUser.name
    };
    onSaveCRMTimelineEvent(timelineEvent);

    alert(`Success: Invoice for Quotation ${quote.id} generated successfully! Status updated to INVOICED. "Approve & Convert" is now available.`);
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
      fileType:
        url.startsWith('data:application/pdf') ||
        url.toLowerCase().includes('.pdf') ||
        category === 'PDF'
          ? 'application/pdf'
          : 'image/jpeg',
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

  const handleSaveQuotation = (statusToSave: 'Draft' | 'Sent' | 'INVOICED') => {
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

    const customer = resolveQuotationCustomer({ customer_id: quoteCustomerId, customer_name: '' } as CRMQuotation, db.crmCustomers, db.customers);
    const quoteId = editingQuotation ? editingQuotation.id : generateCRMQuotationId(db.crmQuotations || []);
    const nextEstimateNo = (db.crmQuotations && db.crmQuotations.length > 0) 
      ? Math.max(0, ...db.crmQuotations.map(q => q.estimateNo || 0)) + 1 
      : 1;

    const formattedItems: CRMQuotationItem[] = quoteItems.map(item => {
      const q = Math.max(1, Number(item.quantity) || 1);
      const p = Math.max(0, Number(item.unitPrice) || 0);
      const normalizedImages = (item.images || []).map((img: any) => {
        if (typeof img === 'string') {
          return { url: img, description: '' };
        }
        return {
          url: img?.url || '',
          description: img?.description || ''
        };
      }).filter((img: CRMQuotationPhoto) => Boolean(img.url));

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
        images: normalizedImages
      };
    });

    const resolvedCustId = customer.id || quoteCustomerId;
    const resolvedCustName = customer.name || 'Customer';

    const isInvoice = statusToSave === 'INVOICED' || quoteReceivedAmount > 0;
    const determinedStatus: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'INVOICED' = 
      isInvoice 
        ? 'INVOICED' 
        : (statusToSave === 'Draft'
            ? 'Draft'
            : (statusToSave === 'Sent'
                ? 'Sent'
                : (editingQuotation?.status === 'Approved' ? 'Approved' : 'Sent')));

    const newQuote: CRMQuotation = {
      id: quoteId,
      customer_id: resolvedCustId,
      customer_name: resolvedCustName,
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
      status: determinedStatus,
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
      type: isInvoice ? 'quotation_approved' : (statusToSave === 'Draft' ? 'note_added' : 'quotation_sent'),
      title: isInvoice ? 'Invoice Generated' : (editingQuotation ? 'Price Quotation Updated' : (statusToSave === 'Draft' ? 'Quotation Draft Saved' : 'Quotation Issued to Client')),
      description: `Quotation ${quoteId} (${quoteItems.length} product${quoteItems.length > 1 ? 's' : ''}: ${quoteItems.map(i => i.furnitureItem).join(', ')}) saved for ₹${quoteGrandTotal.toLocaleString('en-IN')}.${isInvoice ? ' Status set to INVOICED.' : ''}`,
      timestamp: new Date().toISOString(),
      operator: currentUser.name
    });

    setShowAddQuoteModal(false);
    setEditingQuotation(null);
    if (determinedStatus === 'INVOICED') {
      alert(`Success: Invoice for ${quoteId} generated successfully! Current Status: INVOICED. "Approve & Convert" is now available.`);
    } else if (determinedStatus === 'Draft') {
      alert(`Success: Quotation ${quoteId} saved as Draft.`);
    } else {
      alert(`Success: Quotation ${quoteId} ${editingQuotation ? 'updated' : 'issued'} successfully (Status: Sent).`);
    }
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

  // 4. CUSTOMERS DIRECTORY ENRICHMENT, STATS, FILTERING, SORTING & PAGINATION LOGIC
  const parseTimestampMs = (dateStr?: string): number => {
    if (!dateStr) return 0;
    const trimmed = String(dateStr).trim();
    if (!trimmed) return 0;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0).getTime();
    }
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split(/[\/\-]/).map(Number);
      return new Date(y, m - 1, d, 12, 0, 0).getTime();
    }
    const parsed = new Date(trimmed).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatActivityDateTime = (ms: number, rawIso?: string): { dateLabel: string; timeLabel: string } => {
    if (!ms || ms <= 0) return { dateLabel: '—', timeLabel: '—' };
    const d = new Date(ms);
    if (isNaN(d.getTime())) return { dateLabel: '—', timeLabel: '—' };
    const dateLabel = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const hasExplicitTime = rawIso ? rawIso.includes('T') || rawIso.includes(':') : true;
    const timeLabel = hasExplicitTime
      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '—';
    return { dateLabel, timeLabel };
  };

  // Deduplicate CRM customers strictly by unique ID
  const uniqueDirectoryCustomers = React.useMemo(() => {
    const seenIds = new Set<string>();
    const list: CRMCustomer[] = [];
    for (const c of directoryCustomers) {
      const cleanId = c.id.trim();
      if (!seenIds.has(cleanId)) {
        seenIds.add(cleanId);
        list.push(c);
      }
    }
    return list;
  }, [directoryCustomers]);

  interface EnrichedCustomerMeta {
    journeyStatus: string;
    isPreConversion: boolean;
    isHotLead: boolean;
    isClosedWon: boolean;
    isClosedLost: boolean;
    orderCount: number;
    hasSentQuote: boolean;
    sentQuotesVolume: number;
    totalRevenue: number;
    balanceDue: number;
    hasPendingPayment: boolean;
    hasAnyPayment: boolean;
    isRepeat: boolean;
    isVip: boolean;
    hasPendingFollowUp: boolean;
    hasOverdueOrTodayFollowUp: boolean;
    hasCompletedFollowUp: boolean;
    followUpCount: number;
    lastActivityMs: number;
    lastActivityIso: string;
    lastActivityLabel: string;
  }

  const customerMetaMap = React.useMemo(() => {
    const map = new Map<string, EnrichedCustomerMeta>();
    const todayStr = new Date().toISOString().split('T')[0];

    for (const cust of uniqueDirectoryCustomers) {
      const custOrders = (db.orders || []).filter(o => o.customer_id === cust.id);
      const orderIdSet = new Set(custOrders.map(o => o.id));
      const orderCount = custOrders.length;

      const custQuotes = (db.crmQuotations || []).filter(q => q.customer_id === cust.id);
      const sentQuotes = custQuotes.filter(q => q.status === 'Sent');
      const sentQuotesVolume = sentQuotes.reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0);

      const custFollowUps = (db.crmFollowUps || []).filter(f => f.customer_id === cust.id);
      const hasPendingFollowUp = custFollowUps.some(f => f.status === 'Pending');
      const hasOverdueOrTodayFollowUp = custFollowUps.some(f => f.status === 'Pending' && f.date <= todayStr);
      const hasCompletedFollowUp = custFollowUps.some(f => f.status === 'Completed');

      const orderPayments = (db.payments || []).filter(p => orderIdSet.has(p.order_id));
      const custCrmPayments = (db.crmPayments || []).filter(cp => cp.customer_id === cust.id);

      // Exact preserved VIP calculation rules
      const totalRevenue = orderPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
      const balanceDue = orderPayments.reduce((sum, p) => sum + (Number(p.balance_due) || 0), 0);
      const hasPendingPayment = orderPayments.some(p => (Number(p.balance_due) || 0) > 0);
      const hasAnyPayment = orderPayments.length > 0 || custCrmPayments.length > 0;
      const isRepeat = orderCount > 1;
      const isVip = orderCount >= 2 || totalRevenue > 200000;

      const journeyStatus = getCustomerStatus(cust);
      const isPreConversion = [
        'New Inquiry',
        'New Lead',
        'Quotation Pending',
        'Contacted',
        'Quotation Sent',
        'Quote Sent',
        'Follow-up',
        'Qualified',
      ].includes(journeyStatus);
      const isHotLead = ['Quotation Sent', 'Quote Sent', 'Follow-up', 'Qualified'].includes(journeyStatus);
      const isClosedWon = ['Order Confirmed', 'Closed Won', 'In Production', 'Delivered'].includes(journeyStatus);
      const isClosedLost = ['Disqualified', 'Deal Lost', 'Cancelled'].includes(journeyStatus);

      // Calculate dynamic last activity from Timeline, Orders & Stage Logs, Quotations, Follow-ups, Payments, Notes, Attachments -> fallback to created_at
      let bestMs = parseTimestampMs(cust.created_at);
      let bestIso = cust.created_at || '';
      let bestLabel = 'Customer registered';

      const consider = (ts: string | undefined, label: string) => {
        const ms = parseTimestampMs(ts);
        if (ms > bestMs && ts) {
          bestMs = ms;
          bestIso = ts;
          bestLabel = label;
        }
      };

      (db.crmTimelineEvents || []).forEach(evt => {
        if (evt.customer_id === cust.id) consider(evt.timestamp, evt.title || 'Timeline activity');
      });
      custOrders.forEach(ord => {
        consider(ord.created_at || ord.order_date, `Order ${ord.article_no}`);
      });
      (db.statusLogs || []).forEach(log => {
        if (orderIdSet.has(log.order_id)) consider(log.timestamp, `Stage: ${log.stage}`);
      });
      custQuotes.forEach(q => {
        consider(q.created_at, `Quotation ${q.id}`);
      });
      custFollowUps.forEach(f => {
        consider(f.created_at || f.date, `Follow-up: ${f.status}`);
      });
      orderPayments.forEach(p => {
        consider(p.created_at || p.payment_date, 'Order payment logged');
      });
      custCrmPayments.forEach(cp => {
        consider(cp.payment_date, 'CRM payment logged');
      });
      (db.crmNotes || []).forEach(n => {
        if (n.customer_id === cust.id) consider(n.timestamp, 'Note added');
      });
      (db.crmAttachments || []).forEach(a => {
        if (a.customer_id === cust.id) consider(a.uploaded_at, `Attachment: ${a.fileName}`);
      });

      map.set(cust.id, {
        journeyStatus,
        isPreConversion,
        isHotLead,
        isClosedWon,
        isClosedLost,
        orderCount,
        hasSentQuote: sentQuotes.length > 0,
        sentQuotesVolume,
        totalRevenue,
        balanceDue,
        hasPendingPayment,
        hasAnyPayment,
        isRepeat,
        isVip,
        hasPendingFollowUp,
        hasOverdueOrTodayFollowUp,
        hasCompletedFollowUp,
        followUpCount: custFollowUps.length,
        lastActivityMs: bestMs,
        lastActivityIso: bestIso,
        lastActivityLabel: bestLabel,
      });
    }

    return map;
  }, [
    uniqueDirectoryCustomers,
    db.orders,
    db.crmQuotations,
    db.crmFollowUps,
    db.payments,
    db.crmPayments,
    db.crmTimelineEvents,
    db.statusLogs,
    db.crmNotes,
    db.crmAttachments,
  ]);

  // Dynamic unique sources & cities for Filter Drawer dropdowns
  const availableSources = React.useMemo(() => {
    const defaults = ['Walkin', 'IndiaMART', 'Social Media', 'Website', 'Reference', 'TradeIndia', 'Email', 'Youtube', 'Manual'];
    const fromData = uniqueDirectoryCustomers.map(c => c.source?.trim()).filter(Boolean) as string[];
    return Array.from(new Set([...fromData, ...defaults]));
  }, [uniqueDirectoryCustomers]);

  const availableCities = React.useMemo(() => {
    const set = new Set<string>();
    uniqueDirectoryCustomers.forEach(c => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [uniqueDirectoryCustomers]);

  // 6 Statistic Cards + Segmentation Counts computed from unique customer IDs
  const directoryMetrics = React.useMemo(() => {
    const currNow = new Date();
    const currYear = currNow.getFullYear();
    const currMonth = currNow.getMonth();
    const prevDate = new Date(currYear, currMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();

    let totalCustomersCount = uniqueDirectoryCustomers.length;
    let newThisMonth = 0;
    let newLastMonth = 0;
    let beforeThisMonth = 0;
    let activeLeads = 0;
    let hotPipeline = 0;
    let quotesSentCustomers = 0;
    let quotesSentVolume = 0;
    let closedWonCustomers = 0;
    let closedLostCustomers = 0;
    let repeatCustomers = 0;
    let vipCustomers = 0;
    let latestSyncMs = 0;

    for (const cust of uniqueDirectoryCustomers) {
      const meta = customerMetaMap.get(cust.id);
      if (!meta) continue;

      if (meta.lastActivityMs > latestSyncMs) {
        latestSyncMs = meta.lastActivityMs;
      }

      const createdMs = parseTimestampMs(cust.created_at);
      if (createdMs > 0) {
        const cd = new Date(createdMs);
        const cy = cd.getFullYear();
        const cm = cd.getMonth();
        if (cy === currYear && cm === currMonth) {
          newThisMonth += 1;
        } else {
          beforeThisMonth += 1;
          if (cy === prevYear && cm === prevMonth) {
            newLastMonth += 1;
          }
        }
      }

      if (meta.isPreConversion) activeLeads += 1;
      if (meta.isHotLead) hotPipeline += 1;
      if (meta.hasSentQuote) {
        quotesSentCustomers += 1;
        quotesSentVolume += meta.sentQuotesVolume;
      }
      if (meta.isClosedWon) closedWonCustomers += 1;
      if (meta.isClosedLost) closedLostCustomers += 1;
      if (meta.isRepeat) repeatCustomers += 1;
      if (meta.isVip) vipCustomers += 1;
    }

    const totalDeltaPct =
      beforeThisMonth > 0
        ? Math.round((newThisMonth / beforeThisMonth) * 1000) / 10
        : newThisMonth > 0
        ? 100
        : 0;

    const monthlyDeltaPct =
      newLastMonth > 0
        ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 1000) / 10
        : newThisMonth > 0
        ? 100
        : 0;

    const conversionRatePct =
      totalCustomersCount > 0 ? Math.round((closedWonCustomers / totalCustomersCount) * 100) : 0;

    const repeatRatePct =
      totalCustomersCount > 0 ? ((repeatCustomers / totalCustomersCount) * 100).toFixed(1) : '0.0';

    return {
      totalCustomers: totalCustomersCount,
      totalDeltaPct,
      newThisMonth,
      newLastMonth,
      monthlyDeltaPct,
      activeLeads,
      hotPipeline,
      quotesSentCustomers,
      quotesSentVolume,
      closedWonCustomers,
      conversionRatePct,
      repeatCustomers,
      repeatRatePct,
      vipCustomers,
      closedLostCustomers,
      latestSyncMs,
    };
  }, [uniqueDirectoryCustomers, customerMetaMap]);

  const activeAdvancedFilterCount = React.useMemo(() => {
    let count = 0;
    if (advStatus !== 'all') count++;
    if (advCustomerType !== 'all') count++;
    if (advPaymentStatus !== 'all') count++;
    if (advSource !== 'all') count++;
    if (advCity !== 'all') count++;
    if (advBudgetRange !== 'all') count++;
    if (advRegDatePreset !== 'all') count++;
    if (advProductReq.trim() !== '') count++;
    if (advOrderCount !== 'all') count++;
    if (advContactMethod !== 'all') count++;
    if (advFollowUpStatus !== 'all') count++;
    return count;
  }, [
    advStatus,
    advCustomerType,
    advPaymentStatus,
    advSource,
    advCity,
    advBudgetRange,
    advRegDatePreset,
    advProductReq,
    advOrderCount,
    advContactMethod,
    advFollowUpStatus,
  ]);

  const clearAllDirectoryFilters = () => {
    setCustSearch('');
    setCustFilter('all');
    setAdvStatus('all');
    setAdvCustomerType('all');
    setAdvPaymentStatus('all');
    setAdvSource('all');
    setAdvCity('all');
    setAdvBudgetRange('all');
    setAdvRegDatePreset('all');
    setAdvRegStartDate('');
    setAdvRegEndDate('');
    setAdvProductReq('');
    setAdvOrderCount('all');
    setAdvContactMethod('all');
    setAdvFollowUpStatus('all');
    setCustPage(1);
  };

  // Combined search + segmentation tab + 11 advanced filters + sorting
  const filteredCustomersList = React.useMemo(() => {
    const searchLower = custSearch.trim().toLowerCase();
    const reqFilterLower = advProductReq.trim().toLowerCase();
    const regBounds =
      advRegDatePreset !== 'all'
        ? getDateFilterBounds(advRegDatePreset as DateRangePreset, advRegStartDate, advRegEndDate)
        : { startMs: null, endMs: null };

    return uniqueDirectoryCustomers
      .filter(c => {
        const meta = customerMetaMap.get(c.id);
        if (!meta) return false;

        // 1. Search bar match
        if (searchLower) {
          const matchesSearch =
            (c.name || '').toLowerCase().includes(searchLower) ||
            (c.id || '').toLowerCase().includes(searchLower) ||
            (c.phone || '').toLowerCase().includes(searchLower) ||
            (c.whatsappNumber || '').toLowerCase().includes(searchLower) ||
            (c.productRequirement || '').toLowerCase().includes(searchLower) ||
            (c.city || '').toLowerCase().includes(searchLower) ||
            (c.state || '').toLowerCase().includes(searchLower) ||
            (c.address || '').toLowerCase().includes(searchLower) ||
            (c.companyName || '').toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }

        // 2. Segmentation tab filter
        if (custFilter === 'active_leads' && !meta.isPreConversion) return false;
        if (custFilter === 'repeat' && !meta.isRepeat) return false;
        if (custFilter === 'vip' && !meta.isVip) return false;
        if (custFilter === 'closed_won' && !meta.isClosedWon) return false;
        if (custFilter === 'closed_lost' && !meta.isClosedLost) return false;

        // 3. Advanced Filter: Journey Status
        if (advStatus !== 'all' && meta.journeyStatus !== advStatus) return false;

        // 4. Advanced Filter: Customer Type & VIP
        if (advCustomerType === 'vip' && !meta.isVip) return false;
        if (advCustomerType === 'repeat' && !meta.isRepeat) return false;
        if (advCustomerType === 'single_order' && meta.orderCount !== 1) return false;
        if (advCustomerType === 'lead_only' && meta.orderCount !== 0) return false;

        // 5. Advanced Filter: Payment Status
        if (advPaymentStatus === 'pending_payment' && !meta.hasPendingPayment) return false;
        if (advPaymentStatus === 'fully_paid' && (!meta.hasAnyPayment || meta.hasPendingPayment)) return false;
        if (advPaymentStatus === 'no_payments' && meta.hasAnyPayment) return false;

        // 6. Advanced Filter: Source
        if (advSource !== 'all') {
          const custSource = (c.source || 'Walkin').trim().toLowerCase();
          if (custSource !== advSource.toLowerCase()) return false;
        }

        // 7. Advanced Filter: City
        if (advCity !== 'all') {
          const custCity = (c.city || '').trim().toLowerCase();
          if (custCity !== advCity.toLowerCase()) return false;
        }

        // 8. Advanced Filter: Budget Range
        if (advBudgetRange !== 'all') {
          const b = Number(c.budget) || 0;
          if (advBudgetRange === 'not_set' && c.budget !== undefined && c.budget !== null && b > 0) return false;
          if (advBudgetRange === 'under_50k' && (b <= 0 || b >= 50000)) return false;
          if (advBudgetRange === '50k_150k' && (b < 50000 || b > 150000)) return false;
          if (advBudgetRange === '150k_300k' && (b <= 150000 || b > 300000)) return false;
          if (advBudgetRange === 'above_300k' && b <= 300000) return false;
        }

        // 9. Advanced Filter: Registration Date
        if (advRegDatePreset !== 'all') {
          if (!isDateInBounds(c.created_at, regBounds.startMs, regBounds.endMs)) return false;
        }

        // 10. Advanced Filter: Product Requirement
        if (reqFilterLower) {
          if (!(c.productRequirement || '').toLowerCase().includes(reqFilterLower)) return false;
        }

        // 11. Advanced Filter: Order Count
        if (advOrderCount === '0' && meta.orderCount !== 0) return false;
        if (advOrderCount === '1' && meta.orderCount !== 1) return false;
        if (advOrderCount === '2_plus' && meta.orderCount < 2) return false;
        if (advOrderCount === '3_plus' && meta.orderCount < 3) return false;

        // 12. Advanced Filter: Preferred Contact Method
        if (advContactMethod !== 'all') {
          const pref = (c.preferredContactMethod || 'WhatsApp').toLowerCase();
          if (pref !== advContactMethod.toLowerCase()) return false;
        }

        // 13. Advanced Filter: Follow-up Status
        if (advFollowUpStatus === 'pending' && !meta.hasPendingFollowUp) return false;
        if (advFollowUpStatus === 'overdue_today' && !meta.hasOverdueOrTodayFollowUp) return false;
        if (advFollowUpStatus === 'completed' && (meta.hasPendingFollowUp || !meta.hasCompletedFollowUp)) return false;
        if (advFollowUpStatus === 'none' && meta.followUpCount > 0) return false;

        return true;
      })
      .sort((a, b) => {
        const metaA = customerMetaMap.get(a.id);
        const metaB = customerMetaMap.get(b.id);
        switch (custSortBy) {
          case 'recent_activity': {
            const diff = (metaB?.lastActivityMs || 0) - (metaA?.lastActivityMs || 0);
            if (diff !== 0) return diff;
            return compareCRMCustomersDesc(a, b);
          }
          case 'newest_registered': {
            const diff = parseTimestampMs(b.created_at) - parseTimestampMs(a.created_at);
            if (diff !== 0) return diff;
            return compareCRMCustomersDesc(a, b);
          }
          case 'name_asc':
            return (a.name || '').localeCompare(b.name || '');
          case 'budget_desc':
            return (Number(b.budget) || 0) - (Number(a.budget) || 0);
          case 'orders_desc':
            return (metaB?.orderCount || 0) - (metaA?.orderCount || 0);
          case 'revenue_desc':
            return (metaB?.totalRevenue || 0) - (metaA?.totalRevenue || 0);
          case 'id_desc':
          default:
            return compareCRMCustomersDesc(a, b);
        }
      });
  }, [
    uniqueDirectoryCustomers,
    customerMetaMap,
    custSearch,
    custFilter,
    advStatus,
    advCustomerType,
    advPaymentStatus,
    advSource,
    advCity,
    advBudgetRange,
    advRegDatePreset,
    advRegStartDate,
    advRegEndDate,
    advProductReq,
    advOrderCount,
    advContactMethod,
    advFollowUpStatus,
    custSortBy,
  ]);

  // Reset pagination to page 1 when search, filters, or sort changes
  React.useEffect(() => {
    setCustPage(1);
  }, [
    custSearch,
    custFilter,
    advStatus,
    advCustomerType,
    advPaymentStatus,
    advSource,
    advCity,
    advBudgetRange,
    advRegDatePreset,
    advRegStartDate,
    advRegEndDate,
    advProductReq,
    advOrderCount,
    advContactMethod,
    advFollowUpStatus,
    custSortBy,
    custPageSize,
  ]);

  const totalFilteredPages = Math.max(1, Math.ceil(filteredCustomersList.length / custPageSize));
  const safeCurrentPage = Math.min(custPage, totalFilteredPages);
  const paginatedCustomers = React.useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * custPageSize;
    return filteredCustomersList.slice(startIdx, startIdx + custPageSize);
  }, [filteredCustomersList, safeCurrentPage, custPageSize]);

  const paginationNumbers = React.useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalFilteredPages <= 6) {
      for (let i = 1; i <= totalFilteredPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalFilteredPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalFilteredPages - 2) pages.push('ellipsis');
      pages.push(totalFilteredPages);
    }
    return pages;
  }, [totalFilteredPages, safeCurrentPage]);

  const handleExportFilteredCustomersCSV = () => {
    if (filteredCustomersList.length === 0) {
      alert('No matching customers available to export.');
      return;
    }

    const csvEscape = (val: unknown): string => {
      const str = val === null || val === undefined ? '' : String(val);
      if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Customer ID',
      'Full Name',
      'Company Name',
      'Mobile Number',
      'Preferred Contact',
      'Email',
      'Journey Status',
      'Source',
      'Budget (INR)',
      'Product Requirement',
      'City',
      'State',
      'Address',
      'Orders Count',
      'Total Revenue (INR)',
      'Balance Due (INR)',
      'VIP Status',
      'Repeat Customer',
      'Follow-up Status',
      'Last Activity Date',
      'Registered Date',
    ];

    const rows = filteredCustomersList.map(cust => {
      const meta = customerMetaMap.get(cust.id);
      const followUpLabel = meta?.hasPendingFollowUp
        ? meta.hasOverdueOrTodayFollowUp
          ? 'Due / Overdue'
          : 'Pending'
        : meta?.hasCompletedFollowUp
        ? 'Completed'
        : 'None';
      const lastActStr = meta?.lastActivityMs
        ? new Date(meta.lastActivityMs).toLocaleString('en-IN')
        : '';
      const regStr = cust.created_at ? formatToDDMMYYYY(cust.created_at) : '';

      return [
        cust.id,
        cust.name,
        cust.companyName || '',
        cust.phone,
        cust.preferredContactMethod || 'WhatsApp',
        cust.email || '',
        meta?.journeyStatus || 'New Inquiry',
        cust.source || 'Walkin',
        cust.budget || '',
        cust.productRequirement || '',
        cust.city || '',
        cust.state || '',
        cust.address || '',
        meta?.orderCount || 0,
        meta?.totalRevenue || 0,
        meta?.balanceDue || 0,
        meta?.isVip ? 'VIP' : 'Standard',
        meta?.isRepeat ? 'Yes' : 'No',
        followUpLabel,
        lastActStr,
        regStr,
      ].map(csvEscape).join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(csvEscape).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bhisez_customers_directory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Quotations Management States (Zero preselection on initial load; restored from URL params across refresh)
  const [quoteStatusTab, setQuoteStatusTab] = React.useState<QuotationStatusTab>(() => {
    const v = initialSearchParams.get('qTab');
    return v === 'draft' || v === 'sent' || v === 'approved' || v === 'invoiced' || v === 'in_production' ? v : 'all';
  });
  const [quoteDatePreset, setQuoteDatePreset] = React.useState<QuotationDatePreset>(() => {
    const v = initialSearchParams.get('qDate');
    return v === 'today' || v === '7days' || v === '30days' || v === 'this_month' || v === 'custom' ? v : 'all';
  });
  const [quoteCustomStartDate, setQuoteCustomStartDate] = React.useState<string>(() => initialSearchParams.get('qFrom') || '');
  const [quoteCustomEndDate, setQuoteCustomEndDate] = React.useState<string>(() => initialSearchParams.get('qTo') || '');
  const [quoteValidityFilter, setQuoteValidityFilter] = React.useState<QuotationValidityFilter>(() => {
    const v = initialSearchParams.get('qVal');
    return v === 'active' || v === 'expiring_soon' || v === 'expired' || v === 'draft_review' ? v : 'all';
  });
  const [quoteAmountRange, setQuoteAmountRange] = React.useState<QuotationAmountRange>(() => {
    const v = initialSearchParams.get('qAmt');
    return v === 'under_50k' || v === '50k_150k' || v === 'above_150k' || v === 'custom' ? v : 'all';
  });
  const [quoteCustomMinAmt, setQuoteCustomMinAmt] = React.useState<string>(() => initialSearchParams.get('qMin') || '');
  const [quoteCustomMaxAmt, setQuoteCustomMaxAmt] = React.useState<string>(() => initialSearchParams.get('qMax') || '');
  const [quoteAdvQuoteStatus, setQuoteAdvQuoteStatus] = React.useState<string>(() => initialSearchParams.get('qStatus') || 'all');
  const [quoteAdvInvoiceStatus, setQuoteAdvInvoiceStatus] = React.useState<string>(() => initialSearchParams.get('qPay') || 'all');
  const [quoteAdvProductionStatus, setQuoteAdvProductionStatus] = React.useState<string>(() => initialSearchParams.get('qProd') || 'all');
  const [quoteSortBy, setQuoteSortBy] = React.useState<QuotationSortBy>(() => {
    const v = initialSearchParams.get('qSort');
    return v === 'oldest' || v === 'highest_value' || v === 'lowest_value' || v === 'expiring_soon' ? v : 'newest';
  });
  const [showQuoteAdvFilters, setShowQuoteAdvFilters] = React.useState<boolean>(() => initialSearchParams.get('qAdv') === '1');
  const [selectedQuoteIds, setSelectedQuoteIds] = React.useState<string[]>([]);
  const [showBulkStatusMenu, setShowBulkStatusMenu] = React.useState<boolean>(false);
  const [showQuoteAuditLogModal, setShowQuoteAuditLogModal] = React.useState<boolean>(false);
  const [quoteAuditSearch, setQuoteAuditSearch] = React.useState<string>('');
  const [quotePage, setQuotePage] = React.useState<number>(1);
  const [quotePageSize, setQuotePageSize] = React.useState<number>(10);
  const [quoteNoticeMsg, setQuoteNoticeMsg] = React.useState<string | null>(null);

  // Sync CRM subTab & Quotations filter state into URL search params so page refresh preserves exact filters
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'crm');
    url.searchParams.set('crmTab', subTab);

    const quoteKeys = ['qTab', 'qSort', 'qAdv', 'qStatus', 'qPay', 'qProd', 'qSearch', 'qDate', 'qFrom', 'qTo', 'qVal', 'qAmt', 'qMin', 'qMax'];
    quoteKeys.forEach((k) => url.searchParams.delete(k));

    if (subTab === 'quotations') {
      if (quoteStatusTab !== 'all') url.searchParams.set('qTab', quoteStatusTab);
      if (quoteSortBy !== 'newest') url.searchParams.set('qSort', quoteSortBy);
      if (showQuoteAdvFilters) url.searchParams.set('qAdv', '1');
      if (quoteAdvQuoteStatus !== 'all') url.searchParams.set('qStatus', quoteAdvQuoteStatus);
      if (quoteAdvInvoiceStatus !== 'all') url.searchParams.set('qPay', quoteAdvInvoiceStatus);
      if (quoteAdvProductionStatus !== 'all') url.searchParams.set('qProd', quoteAdvProductionStatus);
      if (quoteSearch.trim()) url.searchParams.set('qSearch', quoteSearch.trim());
      if (quoteDatePreset !== 'all') url.searchParams.set('qDate', quoteDatePreset);
      if (quoteCustomStartDate) url.searchParams.set('qFrom', quoteCustomStartDate);
      if (quoteCustomEndDate) url.searchParams.set('qTo', quoteCustomEndDate);
      if (quoteValidityFilter !== 'all') url.searchParams.set('qVal', quoteValidityFilter);
      if (quoteAmountRange !== 'all') url.searchParams.set('qAmt', quoteAmountRange);
      if (quoteCustomMinAmt) url.searchParams.set('qMin', quoteCustomMinAmt);
      if (quoteCustomMaxAmt) url.searchParams.set('qMax', quoteCustomMaxAmt);
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [
    subTab,
    quoteStatusTab,
    quoteSortBy,
    showQuoteAdvFilters,
    quoteAdvQuoteStatus,
    quoteAdvInvoiceStatus,
    quoteAdvProductionStatus,
    quoteSearch,
    quoteDatePreset,
    quoteCustomStartDate,
    quoteCustomEndDate,
    quoteValidityFilter,
    quoteAmountRange,
    quoteCustomMinAmt,
    quoteCustomMaxAmt,
  ]);

  const validRawQuotations = React.useMemo(() => {
    const seen = new Set<string>();
    const list: CRMQuotation[] = [];
    for (const q of db.crmQuotations || []) {
      if (!q || (!q.customer_name?.trim() && (!q.items || q.items.length === 0) && !q.id?.trim())) continue;
      if (
        (q as any).deleted === true ||
        (q as any).isDeleted === true ||
        (q as any).is_deleted === true ||
        Boolean((q as any).deletedAt) ||
        Boolean((q as any).deleted_at) ||
        (q as any).isActive === false ||
        (q as any).is_active === false ||
        ['DELETED', 'VOID', 'CANCELLED'].includes(String(q.status || '').trim().toUpperCase())
      ) {
        continue;
      }
      const cleanId = (q.id || '').trim();
      if (cleanId && seen.has(cleanId)) continue;
      if (cleanId) seen.add(cleanId);
      list.push(q);
    }
    return list;
  }, [db.crmQuotations]);

  const enrichedQuotations = React.useMemo(() => {
    const now = new Date();
    return validRawQuotations.map((q) =>
      enrichQuotationRecord(
        q,
        db.crmCustomers || [],
        db.customers || [],
        db.orders || [],
        db.payments || [],
        db.crmPayments || [],
        now
      )
    );
  }, [validRawQuotations, db.crmCustomers, db.customers, db.orders, db.payments, db.crmPayments]);

  const quotationTabCounts = React.useMemo(
    () => computeQuotationTabCounts(enrichedQuotations),
    [enrichedQuotations]
  );

  const filteredEnrichedQuotations = React.useMemo(
    () =>
      filterAndSortQuotations(enrichedQuotations, {
        statusTab: quoteStatusTab,
        search: quoteSearch,
        datePreset: quoteDatePreset,
        customStartDate: quoteCustomStartDate,
        customEndDate: quoteCustomEndDate,
        validity: quoteValidityFilter,
        amountRange: quoteAmountRange,
        customMinAmount: quoteCustomMinAmt,
        customMaxAmount: quoteCustomMaxAmt,
        advQuoteStatus: quoteAdvQuoteStatus,
        advInvoiceStatus: quoteAdvInvoiceStatus,
        advProductionStatus: quoteAdvProductionStatus,
        sortBy: quoteSortBy,
      }),
    [
      enrichedQuotations,
      quoteStatusTab,
      quoteSearch,
      quoteDatePreset,
      quoteCustomStartDate,
      quoteCustomEndDate,
      quoteValidityFilter,
      quoteAmountRange,
      quoteCustomMinAmt,
      quoteCustomMaxAmt,
      quoteAdvQuoteStatus,
      quoteAdvInvoiceStatus,
      quoteAdvProductionStatus,
      quoteSortBy,
    ]
  );

  const activeQuoteAdvFilterCount = React.useMemo(() => {
    let count = 0;
    if (quoteAdvQuoteStatus !== 'all') count++;
    if (quoteAdvInvoiceStatus !== 'all') count++;
    if (quoteAdvProductionStatus !== 'all') count++;
    if (quoteDatePreset === 'custom' && (quoteCustomStartDate || quoteCustomEndDate)) count++;
    if (quoteAmountRange === 'custom' && (quoteCustomMinAmt || quoteCustomMaxAmt)) count++;
    return count;
  }, [
    quoteAdvQuoteStatus,
    quoteAdvInvoiceStatus,
    quoteAdvProductionStatus,
    quoteDatePreset,
    quoteCustomStartDate,
    quoteCustomEndDate,
    quoteAmountRange,
    quoteCustomMinAmt,
    quoteCustomMaxAmt,
  ]);

  const hasAnyQuoteFilterActive = React.useMemo(() => {
    return (
      quoteStatusTab !== 'all' ||
      quoteSearch.trim() !== '' ||
      quoteDatePreset !== 'all' ||
      quoteValidityFilter !== 'all' ||
      quoteAmountRange !== 'all' ||
      activeQuoteAdvFilterCount > 0
    );
  }, [
    quoteStatusTab,
    quoteSearch,
    quoteDatePreset,
    quoteValidityFilter,
    quoteAmountRange,
    activeQuoteAdvFilterCount,
  ]);

  const clearAllQuotationFilters = () => {
    setQuoteStatusTab('all');
    setQuoteSearch('');
    setQuoteDatePreset('all');
    setQuoteCustomStartDate('');
    setQuoteCustomEndDate('');
    setQuoteValidityFilter('all');
    setQuoteAmountRange('all');
    setQuoteCustomMinAmt('');
    setQuoteCustomMaxAmt('');
    setQuoteAdvQuoteStatus('all');
    setQuoteAdvInvoiceStatus('all');
    setQuoteAdvProductionStatus('all');
    setQuoteSortBy('newest');
    setQuotePage(1);
  };

  // Prune deleted/missing quotation IDs from selection automatically
  React.useEffect(() => {
    const validIds = new Set(enrichedQuotations.map((item) => item.quote.id));
    setSelectedQuoteIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [enrichedQuotations]);

  // Reset pagination to page 1 when quotation filters/sort/pageSize change
  React.useEffect(() => {
    setQuotePage(1);
  }, [
    quoteStatusTab,
    quoteSearch,
    quoteDatePreset,
    quoteCustomStartDate,
    quoteCustomEndDate,
    quoteValidityFilter,
    quoteAmountRange,
    quoteCustomMinAmt,
    quoteCustomMaxAmt,
    quoteAdvQuoteStatus,
    quoteAdvInvoiceStatus,
    quoteAdvProductionStatus,
    quoteSortBy,
    quotePageSize,
  ]);

  const totalQuotePages = Math.max(1, Math.ceil(filteredEnrichedQuotations.length / quotePageSize));
  const safeQuotePage = Math.min(quotePage, totalQuotePages);
  const paginatedQuotations = React.useMemo(() => {
    const startIdx = (safeQuotePage - 1) * quotePageSize;
    return filteredEnrichedQuotations.slice(startIdx, startIdx + quotePageSize);
  }, [filteredEnrichedQuotations, safeQuotePage, quotePageSize]);

  const quotePaginationNumbers = React.useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalQuotePages <= 6) {
      for (let i = 1; i <= totalQuotePages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeQuotePage > 3) pages.push('ellipsis');
      const start = Math.max(2, safeQuotePage - 1);
      const end = Math.min(totalQuotePages - 1, safeQuotePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeQuotePage < totalQuotePages - 2) pages.push('ellipsis');
      pages.push(totalQuotePages);
    }
    return pages;
  }, [totalQuotePages, safeQuotePage]);

  const selectedQuoteSet = React.useMemo(() => new Set(selectedQuoteIds), [selectedQuoteIds]);
  const selectedEnrichedQuotes = React.useMemo(
    () => enrichedQuotations.filter((item) => selectedQuoteSet.has(item.quote.id)),
    [enrichedQuotations, selectedQuoteSet]
  );
  const selectedTotalValue = React.useMemo(
    () => selectedEnrichedQuotes.reduce((sum, item) => sum + item.totalAmount, 0),
    [selectedEnrichedQuotes]
  );

  const allPageQuotesSelected =
    paginatedQuotations.length > 0 && paginatedQuotations.every((item) => selectedQuoteSet.has(item.quote.id));
  const somePageQuotesSelected =
    paginatedQuotations.some((item) => selectedQuoteSet.has(item.quote.id)) && !allPageQuotesSelected;

  const toggleSelectQuote = (quoteId: string) => {
    setSelectedQuoteIds((prev) =>
      prev.includes(quoteId) ? prev.filter((id) => id !== quoteId) : [...prev, quoteId]
    );
    setQuoteNoticeMsg(null);
  };

  const toggleSelectAllOnQuotePage = () => {
    const pageIds = paginatedQuotations.map((item) => item.quote.id);
    if (pageIds.length === 0) return;
    if (allPageQuotesSelected) {
      const pageIdSet = new Set(pageIds);
      setSelectedQuoteIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      setSelectedQuoteIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
    setQuoteNoticeMsg(null);
  };

  const handleExportQuotationsCSV = (listToExport: EnrichedQuotation[], prefix: string) => {
    if (listToExport.length === 0) {
      alert('No quotations available to export.');
      return;
    }
    const csvContent = buildQuotationsCSV(listToExport);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prefix}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMarkQuotationSent = (quote: CRMQuotation) => {
    if (!hasWriteAccess) return;
    if (quote.status !== 'Draft') return;
    const updated: CRMQuotation = { ...quote, status: 'Sent' };
    onSaveCRMQuotation(updated);
    onSaveCRMTimelineEvent({
      id: generateId('evt'),
      customer_id: quote.customer_id,
      type: 'quotation_sent',
      title: 'Quotation Issued to Client',
      description: `Quotation ${quote.id} marked as Sent (₹${(quote.totalAmount ?? 0).toLocaleString('en-IN')}).`,
      timestamp: new Date().toISOString(),
      operator: currentUser.name,
    });
    setQuoteNoticeMsg(`Quotation ${quote.id} marked as Sent.`);
  };

  const handleBulkGenerateInvoices = () => {
    if (!hasWriteAccess || selectedEnrichedQuotes.length === 0) return;
    const eligible = selectedEnrichedQuotes.filter(
      (item) => (item.isDraft || item.isSent) && !item.isInvoiced && !item.isApproved && !item.isRejected
    );
    if (eligible.length === 0) {
      alert('None of the selected quotations are eligible for invoice generation (only Draft or Sent non-invoiced quotations can be invoiced).');
      return;
    }
    const skippedCount = selectedEnrichedQuotes.length - eligible.length;
    const confirmMsg =
      skippedCount > 0
        ? `Generate invoices for ${eligible.length} eligible quotation(s)? (${skippedCount} already invoiced/approved/rejected selection(s) will be skipped.)`
        : `Generate invoices for ${eligible.length} selected quotation(s)? Status will be updated to INVOICED.`;
    if (!window.confirm(confirmMsg)) return;

    eligible.forEach((item) => {
      const updated: CRMQuotation = {
        ...item.quote,
        status: 'INVOICED',
        received_amount: (Number(item.quote.received_amount) || 0) > 0 ? item.quote.received_amount : 0,
      };
      onSaveCRMQuotation(updated);
      onSaveCRMTimelineEvent({
        id: generateId('evt'),
        customer_id: item.quote.customer_id,
        type: 'quotation_approved',
        title: 'Invoice Generated (Bulk)',
        description: `Invoice generated for Quotation ${item.quote.id}. Total: ₹${item.totalAmount.toLocaleString('en-IN')}. Status set to INVOICED.`,
        timestamp: new Date().toISOString(),
        operator: currentUser.name,
      });
    });

    setShowBulkStatusMenu(false);
    setSelectedQuoteIds([]);
    setQuoteNoticeMsg(
      skippedCount > 0
        ? `Generated invoices for ${eligible.length} quotation(s); skipped ${skippedCount} non-eligible selection(s).`
        : `Generated invoices for ${eligible.length} quotation(s).`
    );
  };

  const handleBulkChangeStatus = (targetStatus: 'Sent' | 'Rejected') => {
    if (!hasWriteAccess || selectedEnrichedQuotes.length === 0) return;
    const eligible = selectedEnrichedQuotes.filter((item) => {
      if (targetStatus === 'Sent') return item.isDraft;
      if (targetStatus === 'Rejected') return item.isDraft || item.isSent;
      return false;
    });

    if (eligible.length === 0) {
      alert(
        targetStatus === 'Sent'
          ? 'Only Draft quotations can be marked as Sent.'
          : 'Only Draft or Sent quotations can be marked as Rejected.'
      );
      return;
    }

    const skippedCount = selectedEnrichedQuotes.length - eligible.length;
    if (
      !window.confirm(
        `Update ${eligible.length} eligible quotation(s) to "${targetStatus}"?${
          skippedCount > 0 ? ` (${skippedCount} selection(s) cannot transition to ${targetStatus} and will be skipped.)` : ''
        }`
      )
    ) {
      return;
    }

    eligible.forEach((item) => {
      onSaveCRMQuotation({ ...item.quote, status: targetStatus });
      onSaveCRMTimelineEvent({
        id: generateId('evt'),
        customer_id: item.quote.customer_id,
        type: targetStatus === 'Sent' ? 'quotation_sent' : 'status_change',
        title: `Quotation Marked ${targetStatus}`,
        description: `Bulk status update: Quotation ${item.quote.id} changed to ${targetStatus}.`,
        timestamp: new Date().toISOString(),
        operator: currentUser.name,
      });
    });

    setShowBulkStatusMenu(false);
    setSelectedQuoteIds([]);
    setQuoteNoticeMsg(`Updated ${eligible.length} quotation(s) to ${targetStatus}.`);
  };

  const handleBulkDeleteQuotations = () => {
    if (!hasWriteAccess || selectedEnrichedQuotes.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedEnrichedQuotes.length} selected quotation(s) totaling ₹${selectedTotalValue.toLocaleString('en-IN')} permanently?`
      )
    ) {
      return;
    }
    const idsToDelete = selectedEnrichedQuotes.map((item) => item.quote.id);
    idsToDelete.forEach((id) => onDeleteCRMQuotation(id));
    setShowBulkStatusMenu(false);
    setSelectedQuoteIds([]);
    setQuoteNoticeMsg(`Deleted ${idsToDelete.length} quotation(s).`);
  };

  const quotationAuditEntries = React.useMemo(() => {
    const entries: Array<{
      id: string;
      title: string;
      description: string;
      timestamp: string;
      operator: string;
      kind: string;
    }> = [];

    (db.crmTimelineEvents || []).forEach((evt) => {
      if (!evt) return;
      const text = `${evt.type || ''} ${evt.title || ''} ${evt.description || ''}`.toLowerCase();
      if (
        evt.type === 'quotation_sent' ||
        evt.type === 'quotation_approved' ||
        text.includes('quotation') ||
        text.includes('invoice') ||
        text.includes('qt-')
      ) {
        entries.push({
          id: evt.id,
          title: evt.title,
          description: evt.description,
          timestamp: evt.timestamp,
          operator: evt.operator || 'System',
          kind: evt.type || 'crm_event',
        });
      }
    });

    (db.auditLogs || []).forEach((log) => {
      if (!log) return;
      const text = `${log.event_type || ''} ${log.details || ''}`.toLowerCase();
      if (text.includes('quotation') || text.includes('invoice') || text.includes('qt-')) {
        entries.push({
          id: log.id,
          title: log.event_type?.replace(/_/g, ' ') || 'Audit Event',
          description: log.details,
          timestamp: log.timestamp,
          operator: log.user_email || log.user_role || 'Admin',
          kind: 'audit_log',
        });
      }
    });

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [db.crmTimelineEvents, db.auditLogs]);

  const filteredQuotationAuditEntries = React.useMemo(() => {
    const q = quoteAuditSearch.trim().toLowerCase();
    if (!q) return quotationAuditEntries;
    return quotationAuditEntries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.operator.toLowerCase().includes(q)
    );
  }, [quotationAuditEntries, quoteAuditSearch]);

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
    <div className="space-y-5">
      {/* CRM Main Header Row */}
      <div className="border-b border-stone-200/90 pb-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4a2c1b] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Contact size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-display text-stone-900 tracking-tight leading-tight">
                CRM Module
              </h1>
              <p className="text-stone-500 text-xs mt-0.5">
                Bespoke woodworks customer relationship dashboard, lead funnels, and quotation converters
              </p>
            </div>
          </div>

          {/* Right: Navigation tabs */}
          <div className="flex bg-[#f3ede6] p-1 rounded-xl border border-stone-200/80 max-w-full overflow-x-auto shrink-0 self-start lg:self-auto">
            <button
              onClick={() => { setSubTab('dashboard'); setSelectedCustomerId(null); }}
              className={`whitespace-nowrap shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'dashboard' ? 'bg-[#4a2c1b] text-white shadow-xs' : 'text-stone-600 hover:text-[#4a2c1b]'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setSubTab('customers')}
              className={`whitespace-nowrap shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'customers' ? 'bg-[#4a2c1b] text-white shadow-xs' : 'text-stone-600 hover:text-[#4a2c1b]'
              }`}
            >
              Customers
            </button>
            <button
              onClick={() => { setSubTab('quotations'); setSelectedCustomerId(null); }}
              className={`whitespace-nowrap shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'quotations' ? 'bg-[#4a2c1b] text-white shadow-xs' : 'text-stone-600 hover:text-[#4a2c1b]'
              }`}
            >
              Quotations
            </button>
            <button
              onClick={() => { setSubTab('followups'); setSelectedCustomerId(null); }}
              className={`whitespace-nowrap shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'followups' ? 'bg-[#4a2c1b] text-white shadow-xs' : 'text-stone-600 hover:text-[#4a2c1b]'
              }`}
            >
              Follow-ups
            </button>
          </div>
        </div>

        {/* Action Buttons & Sync Status Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
          {/* Left: Quick Action Buttons */}
          {hasWriteAccess ? (
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => {
                  setEditingCustomer(null);
                  setShowAddCustModal(true);
                  if (subTab !== 'customers') setSubTab('customers');
                  setSelectedCustomerId(null);
                }}
                className="bg-[#4a2c1b] hover:bg-[#382114] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <UserPlus size={14} /> Add Customer
              </button>
              <button
                onClick={() => {
                  setEditingQuotation(null);
                  setShowAddQuoteModal(true);
                }}
                className="bg-[#e05e00] hover:bg-[#c75300] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus size={15} /> New Quotation
              </button>
              {onResequenceCRMCustomers && (
                <button
                  onClick={() => {
                    const result = onResequenceCRMCustomers();
                    if (result.changesCount > 0) {
                      alert(`Success: Re-sequenced ${result.changesCount} customer IDs without gaps (e.g. CRM-26-08-001 ... CRM-26-08-039)!`);
                    } else {
                      alert('All CRM Customer IDs are already perfectly continuous without gaps.');
                    }
                  }}
                  title="Re-sequence CRM Customer IDs to close gaps"
                  className="bg-white hover:bg-stone-50 text-stone-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-stone-200 shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RefreshCw size={13} className="text-stone-500" /> Re-sequence IDs
                </button>
              )}
            </div>
          ) : <div />}

          {/* Right: Real directory sync indicator */}
          <div className="text-[11px] font-medium text-stone-500 flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
            <span>
              Directory live ({directoryMetrics.totalCustomers.toLocaleString('en-IN')} records)
            </span>
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
        <div className="space-y-5">
          <AnimatePresence mode="wait">
            {!selectedCustomerId ? (
              // Main Customers Directory View (Stitch Reference Layout)
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* 1. Six Statistic Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
                  {/* Card 1: Total Customers */}
                  <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">Total Customers</span>
                      <span className="w-7 h-7 rounded-lg bg-[#f4ece6] text-[#593622] flex items-center justify-center shrink-0">
                        <Users size={14} />
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="text-2xl font-black text-stone-900 tabular-nums tracking-tight">
                        {directoryMetrics.totalCustomers.toLocaleString('en-IN')}
                      </div>
                      <p className="text-[11px] font-semibold text-emerald-700 mt-1 flex items-center gap-1 tabular-nums">
                        <TrendingUp size={11} />
                        <span>+{directoryMetrics.totalDeltaPct}% this month</span>
                      </p>
                    </div>
                  </div>

                  {/* Card 2: New This Month */}
                  <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">New This Month</span>
                      <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Calendar size={14} />
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="text-2xl font-black text-stone-900 tabular-nums tracking-tight">
                        {directoryMetrics.newThisMonth.toLocaleString('en-IN')}
                      </div>
                      <p className={`text-[11px] font-semibold mt-1 tabular-nums ${directoryMetrics.monthlyDeltaPct >= 0 ? 'text-emerald-700' : 'text-stone-500'}`}>
                        {directoryMetrics.monthlyDeltaPct >= 0 ? `+${directoryMetrics.monthlyDeltaPct}%` : `${directoryMetrics.monthlyDeltaPct}%`} vs last mo ({directoryMetrics.newLastMonth})
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Active Leads */}
                  <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">Active Leads</span>
                      <span className="w-7 h-7 rounded-lg bg-orange-50 text-[#e05e00] flex items-center justify-center shrink-0">
                        <Clock size={14} />
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="text-2xl font-black text-stone-900 tabular-nums tracking-tight">
                        {directoryMetrics.activeLeads.toLocaleString('en-IN')}
                      </div>
                      <p className="text-[11px] font-medium text-stone-600 mt-1 flex items-center gap-1.5 tabular-nums">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{directoryMetrics.hotPipeline} hot pipeline</span>
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Quotes Sent */}
                  <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">Quotes Sent</span>
                      <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={14} />
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="text-2xl font-black text-stone-900 tabular-nums tracking-tight">
                        {directoryMetrics.quotesSentCustomers.toLocaleString('en-IN')}
                      </div>
                      <p className="text-[11px] font-semibold text-blue-700 mt-1 tabular-nums">
                        {directoryMetrics.quotesSentVolume >= 100000
                          ? `₹${(directoryMetrics.quotesSentVolume / 100000).toFixed(1)}L volume`
                          : `₹${directoryMetrics.quotesSentVolume.toLocaleString('en-IN')} volume`}
                      </p>
                    </div>
                  </div>

                  {/* Card 5: Closed Won */}
                  <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">Closed Won</span>
                      <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle size={14} />
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="text-2xl font-black text-stone-900 tabular-nums tracking-tight">
                        {directoryMetrics.closedWonCustomers.toLocaleString('en-IN')}
                      </div>
                      <p className="text-[11px] font-semibold text-emerald-700 mt-1 tabular-nums">
                        {directoryMetrics.conversionRatePct}% conversion
                      </p>
                    </div>
                  </div>

                  {/* Card 6: Repeat Customers */}
                  <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">Repeat Customers</span>
                      <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <RefreshCw size={14} />
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="text-2xl font-black text-stone-900 tabular-nums tracking-tight">
                        {directoryMetrics.repeatCustomers.toLocaleString('en-IN')}
                      </div>
                      <p className="text-[11px] font-semibold text-purple-700 mt-1 tabular-nums">
                        {directoryMetrics.repeatRatePct}% of total
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Customer Segmentation Tabs Row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    {
                      id: 'all',
                      label: 'All Customers',
                      count: directoryMetrics.totalCustomers,
                      badgeClass: 'bg-white/15 text-white',
                      inactiveBadgeClass: 'bg-stone-100 text-stone-600',
                    },
                    {
                      id: 'active_leads',
                      label: 'Active Leads',
                      count: directoryMetrics.activeLeads,
                      badgeClass: 'bg-white/20 text-white',
                      inactiveBadgeClass: 'bg-stone-100 text-stone-600',
                    },
                    {
                      id: 'repeat',
                      label: 'Repeat Customers',
                      count: directoryMetrics.repeatCustomers,
                      badgeClass: 'bg-white/20 text-white',
                      inactiveBadgeClass: 'bg-stone-100 text-stone-600',
                    },
                    {
                      id: 'vip',
                      label: 'VIP Clients',
                      count: directoryMetrics.vipCustomers,
                      badgeClass: 'bg-amber-400 text-stone-950',
                      inactiveBadgeClass: 'bg-amber-50 text-amber-800 border border-amber-200/70',
                    },
                    {
                      id: 'closed_won',
                      label: 'Closed Won',
                      count: directoryMetrics.closedWonCustomers,
                      badgeClass: 'bg-emerald-500 text-white',
                      inactiveBadgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
                    },
                    {
                      id: 'closed_lost',
                      label: 'Closed Lost',
                      count: directoryMetrics.closedLostCustomers,
                      badgeClass: 'bg-rose-500 text-white',
                      inactiveBadgeClass: 'bg-rose-50 text-rose-700 border border-rose-200/70',
                    },
                  ].map((seg) => {
                    const isActiveSeg = custFilter === seg.id;
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setCustFilter(seg.id as any)}
                        className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
                          isActiveSeg
                            ? 'bg-[#4a2c1b] border-[#4a2c1b] text-white shadow-xs'
                            : 'bg-white border-stone-200/90 text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <span>{seg.label}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                            isActiveSeg ? seg.badgeClass : seg.inactiveBadgeClass
                          }`}
                        >
                          {seg.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 3. Search & Controls Toolbar */}
                <div className="bg-white border border-stone-200/90 p-3 rounded-2xl shadow-xs space-y-2.5">
                  <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
                    {/* Search input */}
                    <div className="relative flex-1 max-w-xl">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                      <input
                        type="text"
                        value={custSearch}
                        onChange={(e) => setCustSearch(e.target.value)}
                        placeholder="Search by name, customer ID, mobile, city, requirement (e.g. Sofa, Bed)..."
                        className="w-full pl-10 pr-8 py-2 bg-[#faf8f5] border border-stone-200 rounded-xl text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#4a2c1b] transition"
                      />
                      {custSearch && (
                        <button
                          type="button"
                          onClick={() => setCustSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                          title="Clear search"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Right Toolbar Controls */}
                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                      {/* Filter Drawer Trigger */}
                      <button
                        type="button"
                        onClick={() => setShowFilterDrawer(true)}
                        className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition cursor-pointer ${
                          activeAdvancedFilterCount > 0 || showFilterDrawer
                            ? 'bg-[#f4ece6] border-[#4a2c1b]/40 text-[#4a2c1b]'
                            : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <Filter size={14} />
                        <span>Filter Drawer</span>
                        {activeAdvancedFilterCount > 0 && (
                          <span className="bg-[#4a2c1b] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums leading-none">
                            {activeAdvancedFilterCount}
                          </span>
                        )}
                      </button>

                      {/* Sort Dropdown */}
                      <div className="relative">
                        <select
                          value={custSortBy}
                          onChange={(e) => setCustSortBy(e.target.value as any)}
                          aria-label="Sort customers"
                          className="bg-white border border-stone-200 hover:border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:border-[#4a2c1b] cursor-pointer"
                        >
                          <option value="recent_activity">Sort: Recent Activity</option>
                          <option value="newest_registered">Sort: Newest Registered</option>
                          <option value="id_desc">Sort: Customer ID (Newest)</option>
                          <option value="name_asc">Sort: Name (A–Z)</option>
                          <option value="budget_desc">Sort: Budget (High–Low)</option>
                          <option value="orders_desc">Sort: Orders Count (High–Low)</option>
                          <option value="revenue_desc">Sort: Revenue (High–Low)</option>
                        </select>
                      </div>

                      {/* Export Filtered CSV */}
                      <button
                        type="button"
                        onClick={handleExportFilteredCustomersCSV}
                        title={`Export ${filteredCustomersList.length} filtered customer(s) to CSV`}
                        className="p-2 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                      >
                        <Download size={15} />
                        <span className="hidden sm:inline">Export CSV</span>
                      </button>

                      {/* Table / Grid View Toggle */}
                      <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
                        <button
                          type="button"
                          onClick={() => setCustViewMode('table')}
                          title="Table View"
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            custViewMode === 'table' ? 'bg-white text-[#4a2c1b] shadow-xs' : 'text-stone-400 hover:text-stone-700'
                          }`}
                        >
                          <List size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustViewMode('grid')}
                          title="Card Grid View"
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            custViewMode === 'grid' ? 'bg-white text-[#4a2c1b] shadow-xs' : 'text-stone-400 hover:text-stone-700'
                          }`}
                        >
                          <Grid size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Active Filters Summary Bar (only shown when filters active) */}
                  {(activeAdvancedFilterCount > 0 || custFilter !== 'all' || custSearch.trim() !== '') && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 text-[11px] flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap text-stone-600">
                        <span className="font-bold text-stone-500 uppercase text-[10px]">Active Filters:</span>
                        {custFilter !== 'all' && (
                          <span className="bg-[#f4ece6] text-[#4a2c1b] px-2 py-0.5 rounded-md font-semibold">
                            Segment: {custFilter.replace('_', ' ')}
                          </span>
                        )}
                        {advStatus !== 'all' && (
                          <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                            Status: {advStatus}
                          </span>
                        )}
                        {advCustomerType !== 'all' && (
                          <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                            Type: {advCustomerType.replace('_', ' ')}
                          </span>
                        )}
                        {advPaymentStatus !== 'all' && (
                          <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                            Payment: {advPaymentStatus.replace('_', ' ')}
                          </span>
                        )}
                        {advSource !== 'all' && (
                          <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                            Source: {advSource}
                          </span>
                        )}
                        {advCity !== 'all' && (
                          <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                            City: {advCity}
                          </span>
                        )}
                        {advBudgetRange !== 'all' && (
                          <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                            Budget: {advBudgetRange.replace('_', ' ')}
                          </span>
                        )}
                        {advRegDatePreset !== 'all' && (
                          <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                            Reg Date: {advRegDatePreset}
                          </span>
                        )}
                        {advProductReq.trim() && (
                          <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                            Req: "{advProductReq}"
                          </span>
                        )}
                        {advOrderCount !== 'all' && (
                          <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                            Orders: {advOrderCount.replace('_', '+')}
                          </span>
                        )}
                        {advContactMethod !== 'all' && (
                          <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                            Reach: {advContactMethod}
                          </span>
                        )}
                        {advFollowUpStatus !== 'all' && (
                          <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                            Follow-up: {advFollowUpStatus.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={clearAllDirectoryFilters}
                        className="text-[#e05e00] hover:underline font-bold cursor-pointer shrink-0"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Main Customer Table / Grid Listings + Pagination */}
                {filteredCustomersList.length > 0 ? (
                  <div className="bg-white border border-stone-200/90 rounded-2xl overflow-hidden shadow-xs">
                    {custViewMode === 'table' ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#faf8f5] border-b border-stone-200 text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                            <tr>
                              <th className="py-3.5 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock size={12} className="text-stone-400" />
                                  Last Activity
                                </span>
                              </th>
                              <th className="py-3.5 px-4 whitespace-nowrap">Customer ID</th>
                              <th className="py-3.5 px-4 whitespace-nowrap">Full Name</th>
                              <th className="py-3.5 px-4 whitespace-nowrap">Journey Status</th>
                              <th className="py-3.5 px-4 whitespace-nowrap">Source</th>
                              <th className="py-3.5 px-4 whitespace-nowrap">Budget</th>
                              <th className="py-3.5 px-4 whitespace-nowrap">Product Requirement</th>
                              <th className="py-3.5 px-4 whitespace-nowrap">Mobile Number</th>
                              <th className="py-3.5 px-4 whitespace-nowrap">Location</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                            {paginatedCustomers.map((cust) => {
                              const meta = customerMetaMap.get(cust.id);
                              const displayStatus = meta?.journeyStatus || getCustomerStatus(cust);
                              const statusMeta = getDirectoryStatusMeta(displayStatus);
                              const { dateLabel, timeLabel } = formatActivityDateTime(
                                meta?.lastActivityMs || 0,
                                meta?.lastActivityIso
                              );
                              const locationLabel = [cust.city, cust.state].filter(Boolean).join(', ') || cust.address || '—';

                              return (
                                <tr
                                  key={cust.id}
                                  onClick={() => setSelectedCustomerId(cust.id)}
                                  className="hover:bg-[#faf8f5]/80 cursor-pointer transition group"
                                >
                                  {/* Last Activity Date & Time */}
                                  <td
                                    className="py-3.5 px-4 whitespace-nowrap"
                                    title={`${meta?.lastActivityLabel || 'Registered'} • Created: ${formatToDDMMYYYY(cust.created_at)}`}
                                  >
                                    <div className="font-semibold text-stone-800 text-[12px] tabular-nums">{dateLabel}</div>
                                    <div className="text-[10px] text-stone-400 font-mono tabular-nums mt-0.5">{timeLabel}</div>
                                  </td>

                                  {/* Customer ID */}
                                  <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] font-semibold text-stone-500">
                                    {cust.id}
                                  </td>

                                  {/* Full Name + subtle VIP / Repeat tag */}
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-stone-900 group-hover:text-[#4a2c1b] transition">
                                        {cust.name || 'Unnamed Client'}
                                      </span>
                                      {meta?.isVip && (
                                        <span
                                          title="VIP Client (2+ Orders or Revenue > ₹2,00,000)"
                                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/80 text-[9px] font-bold"
                                        >
                                          <Crown size={9} /> VIP
                                        </span>
                                      )}
                                    </div>
                                    {(meta?.orderCount || 0) > 0 && (
                                      <span className="text-[10px] text-stone-400 font-medium block mt-0.5 tabular-nums">
                                        {meta?.orderCount} {meta?.orderCount === 1 ? 'order' : 'orders'}
                                        {meta?.hasPendingPayment ? ` · Due ₹${meta.balanceDue.toLocaleString('en-IN')}` : ''}
                                      </span>
                                    )}
                                  </td>

                                  {/* Journey Status */}
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                                      <span>{statusMeta.label}</span>
                                    </span>
                                  </td>

                                  {/* Source */}
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${
                                        (cust.source || '').toLowerCase().includes('social')
                                          ? 'bg-amber-50/80 text-amber-800 border-amber-200/70'
                                          : (cust.source || '').toLowerCase().includes('indiamart')
                                          ? 'bg-[#f4ece6] text-[#593622] border-[#593622]/20'
                                          : 'bg-stone-50 text-stone-700 border-stone-200/80'
                                      }`}
                                    >
                                      {cust.source || 'Walkin'}
                                    </span>
                                  </td>

                                  {/* Budget */}
                                  <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-stone-900 tabular-nums">
                                    {cust.budget && Number(cust.budget) > 0
                                      ? `₹${Number(cust.budget).toLocaleString('en-IN')}`
                                      : <span className="text-stone-400 font-normal">—</span>}
                                  </td>

                                  {/* Product Requirement */}
                                  <td
                                    className="py-3.5 px-4 max-w-[200px] truncate font-semibold text-stone-800"
                                    title={cust.productRequirement || 'Not specified'}
                                  >
                                    {cust.productRequirement || <span className="text-stone-400 font-normal">—</span>}
                                  </td>

                                  {/* Mobile Number */}
                                  <td className="py-3.5 px-4 whitespace-nowrap font-mono text-stone-600 tabular-nums">
                                    {cust.phone || '—'}
                                  </td>

                                  {/* Location */}
                                  <td
                                    className="py-3.5 px-4 max-w-[170px] truncate text-stone-600"
                                    title={locationLabel}
                                  >
                                    {locationLabel}
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3.5 px-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="inline-flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedCustomerId(cust.id)}
                                        title="View Customer Profile"
                                        className="p-1.5 rounded-lg text-stone-500 hover:text-[#4a2c1b] hover:bg-stone-100 transition cursor-pointer"
                                      >
                                        <Eye size={15} />
                                      </button>
                                      {hasWriteAccess && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => { setEditingCustomer(cust); setShowAddCustModal(true); }}
                                            title="Edit Customer"
                                            className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                                          >
                                            <Edit size={15} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (window.confirm(`Are you sure you want to delete customer ${cust.name}? This is irreversible.`)) {
                                                onDeleteCRMCustomer(cust.id);
                                              }
                                            }}
                                            title="Delete Customer"
                                            className="p-1.5 rounded-lg text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                          >
                                            <Trash2 size={15} />
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
                    ) : (
                      // Grid View (respects pagination)
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#faf8f5]/40">
                        {paginatedCustomers.map(cust => {
                          const meta = customerMetaMap.get(cust.id);
                          const displayStatus = meta?.journeyStatus || getCustomerStatus(cust);
                          const statusMeta = getDirectoryStatusMeta(displayStatus);
                          const { dateLabel } = formatActivityDateTime(meta?.lastActivityMs || 0, meta?.lastActivityIso);

                          return (
                            <div
                              key={cust.id}
                              onClick={() => setSelectedCustomerId(cust.id)}
                              className="bg-white border border-stone-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-md hover:border-stone-300 transition duration-150 cursor-pointer group"
                            >
                              <div className="space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-mono text-stone-400 font-bold block">{cust.id}</span>
                                    <h3 className="text-sm font-black text-stone-900 group-hover:text-[#4a2c1b] transition truncate">
                                      {cust.name}
                                    </h3>
                                    {cust.productRequirement && (
                                      <p className="text-[11px] font-medium text-stone-600 truncate mt-0.5">
                                        {cust.productRequirement}
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusMeta.badgeClass}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                                    <span>{statusMeta.label}</span>
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px] py-2 bg-[#faf8f5] rounded-xl px-3 border border-stone-100">
                                  <div>
                                    <span className="text-stone-400 text-[9px] block uppercase font-bold">Source</span>
                                    <span className="text-stone-800 font-semibold capitalize">{cust.source || 'Walkin'}</span>
                                  </div>
                                  <div>
                                    <span className="text-stone-400 text-[9px] block uppercase font-bold">Budget</span>
                                    <span className="text-stone-900 font-mono font-bold tabular-nums">
                                      {cust.budget ? `₹${Number(cust.budget).toLocaleString('en-IN')}` : '—'}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1 text-[11px] text-stone-600">
                                  <p className="flex items-center gap-2 font-mono tabular-nums">
                                    <Phone size={12} className="text-stone-400 shrink-0" /> {cust.phone || '—'}
                                  </p>
                                  <p className="flex items-center gap-2 truncate">
                                    <MapPin size={12} className="text-stone-400 shrink-0" /> {[cust.city, cust.state].filter(Boolean).join(', ') || cust.address || '—'}
                                  </p>
                                  <p className="flex items-center gap-2 text-[10px] text-stone-400">
                                    <Clock size={11} className="shrink-0" /> Activity: {dateLabel}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-stone-100 pt-3 mt-3 text-[10px] font-bold">
                                <div className="flex gap-1.5 items-center">
                                  <span className="bg-[#f4ece6] text-[#4a2c1b] px-2 py-0.5 rounded-md font-mono tabular-nums">
                                    {meta?.orderCount || 0} {(meta?.orderCount || 0) === 1 ? 'order' : 'orders'}
                                  </span>
                                  {meta?.isVip && (
                                    <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                      VIP
                                    </span>
                                  )}
                                  {meta?.hasPendingPayment && (
                                    <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md font-mono tabular-nums">
                                      Due ₹{meta.balanceDue.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>
                                <span className="text-stone-400 group-hover:text-[#4a2c1b] flex items-center gap-0.5 uppercase tracking-wider">
                                  Profile <ChevronRight size={12} />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 5. Pagination Footer */}
                    <div className="bg-[#faf8f5] border-t border-stone-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-medium tabular-nums">
                          Showing{' '}
                          <strong className="text-stone-900">
                            {(safeCurrentPage - 1) * custPageSize + 1}–{Math.min(safeCurrentPage * custPageSize, filteredCustomersList.length)}
                          </strong>{' '}
                          of <strong className="text-stone-900">{filteredCustomersList.length}</strong> customers
                        </span>
                        <label className="inline-flex items-center gap-2 font-medium">
                          <span>Per page:</span>
                          <select
                            value={custPageSize}
                            onChange={(e) => setCustPageSize(Number(e.target.value))}
                            className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#4a2c1b] cursor-pointer tabular-nums"
                          >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </label>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={safeCurrentPage <= 1}
                          onClick={() => setCustPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                          Previous
                        </button>
                        {paginationNumbers.map((item, idx) =>
                          item === 'ellipsis' ? (
                            <span key={`ell_${idx}`} className="px-2 text-stone-400 font-bold">
                              ...
                            </span>
                          ) : (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setCustPage(item)}
                              className={`min-w-[30px] h-[30px] px-2 rounded-lg text-xs font-bold tabular-nums transition cursor-pointer ${
                                safeCurrentPage === item
                                  ? 'bg-[#4a2c1b] text-white shadow-xs'
                                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                              }`}
                            >
                              {item}
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          disabled={safeCurrentPage >= totalFilteredPages}
                          onClick={() => setCustPage((p) => Math.min(totalFilteredPages, p + 1))}
                          className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
                    <Users size={34} className="mx-auto text-stone-300" />
                    <div className="space-y-1">
                      <p className="text-stone-800 font-bold text-sm">No customers matched your criteria</p>
                      <p className="text-stone-500 text-xs">
                        {uniqueDirectoryCustomers.length === 0
                          ? 'Register your first customer lead to start tracking quotations and orders.'
                          : 'Try adjusting or clearing your active search and Filter Drawer selections.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2.5 pt-2">
                      {(activeAdvancedFilterCount > 0 || custFilter !== 'all' || custSearch.trim() !== '') && (
                        <button
                          type="button"
                          onClick={clearAllDirectoryFilters}
                          className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition"
                        >
                          Clear Filters
                        </button>
                      )}
                      {hasWriteAccess && (
                        <button
                          type="button"
                          onClick={() => { setEditingCustomer(null); setShowAddCustModal(true); }}
                          className="bg-[#4a2c1b] hover:bg-[#382114] text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                        >
                          <UserPlus size={14} /> Add Customer
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Advanced Filter Drawer (Slide-over) */}
                {showFilterDrawer && (
                  <div className="fixed inset-0 z-[75] flex justify-end bg-black/40 backdrop-blur-[1px]">
                    <div
                      className="flex-1"
                      onClick={() => setShowFilterDrawer(false)}
                    />
                    <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-stone-200 flex flex-col">
                      <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-[#faf8f5]">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-[#4a2c1b] text-white flex items-center justify-center">
                            <Filter size={15} />
                          </span>
                          <div>
                            <h3 className="text-sm font-black text-stone-900">Filter Customers</h3>
                            <p className="text-[11px] text-stone-500">
                              {filteredCustomersList.length} matching of {uniqueDirectoryCustomers.length} unique customers
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowFilterDrawer(false)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                        {/* 1. Journey Status */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-stone-700 block">1. Journey Status</label>
                          <select
                            value={advStatus}
                            onChange={(e) => setAdvStatus(e.target.value)}
                            className="w-full bg-[#faf8f5] border border-stone-200 rounded-xl px-3 py-2 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                          >
                            <option value="all">All Journey Statuses</option>
                            <option value="New Inquiry">New Inquiry</option>
                            <option value="Quotation Pending">Quotation Pending</option>
                            <option value="Quotation Sent">Quotation Sent</option>
                            <option value="Follow-up">Follow-up</option>
                            <option value="Order Confirmed">Order Confirmed</option>
                            <option value="In Production">In Production</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Disqualified">Disqualified / Lost</option>
                          </select>
                        </div>

                        {/* 2. Customer Type & VIP Classification */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-stone-700 block">2. Customer Type & VIP Classification</label>
                          <select
                            value={advCustomerType}
                            onChange={(e) => setAdvCustomerType(e.target.value)}
                            className="w-full bg-[#faf8f5] border border-stone-200 rounded-xl px-3 py-2 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                          >
                            <option value="all">All Customer Types</option>
                            <option value="vip">VIP Clients (2+ Orders or Revenue &gt; ₹2L)</option>
                            <option value="repeat">Repeat Customers (&gt; 1 Order)</option>
                            <option value="single_order">Single Order Clients (1 Order)</option>
                            <option value="lead_only">Prospect / Lead Only (0 Orders)</option>
                          </select>
                        </div>

                        {/* 3. Payment Status */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-stone-700 block">3. Payment Status</label>
                          <select
                            value={advPaymentStatus}
                            onChange={(e) => setAdvPaymentStatus(e.target.value)}
                            className="w-full bg-[#faf8f5] border border-stone-200 rounded-xl px-3 py-2 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                          >
                            <option value="all">All Payment Statuses</option>
                            <option value="pending_payment">Pending Payment (Balance Due &gt; ₹0)</option>
                            <option value="fully_paid">Fully Paid</option>
                            <option value="no_payments">No Payments Recorded</option>
                          </select>
                        </div>

                        {/* 4 & 5. Source + City */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="font-bold text-stone-700 block">4. Source</label>
                            <select
                              value={advSource}
                              onChange={(e) => setAdvSource(e.target.value)}
                              className="w-full bg-[#faf8f5] border border-stone-200 rounded-xl px-3 py-2 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                            >
                              <option value="all">All Sources</option>
                              {availableSources.map((src) => (
                                <option key={src} value={src}>{src}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-stone-700 block">5. City</label>
                            <select
                              value={advCity}
                              onChange={(e) => setAdvCity(e.target.value)}
                              className="w-full bg-[#faf8f5] border border-stone-200 rounded-xl px-3 py-2 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                            >
                              <option value="all">All Cities</option>
                              {availableCities.map((city) => (
                                <option key={city} value={city}>{city}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* 6. Budget Range */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-stone-700 block">6. Budget Range</label>
                          <select
                            value={advBudgetRange}
                            onChange={(e) => setAdvBudgetRange(e.target.value)}
                            className="w-full bg-[#faf8f5] border border-stone-200 rounded-xl px-3 py-2 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                          >
                            <option value="all">Any Budget</option>
                            <option value="under_50k">Under ₹50,000</option>
                            <option value="50k_150k">₹50,000 – ₹1,50,000</option>
                            <option value="150k_300k">₹1,50,001 – ₹3,00,000</option>
                            <option value="above_300k">Above ₹3,00,000</option>
                            <option value="not_set">Budget Not Specified</option>
                          </select>
                        </div>

                        {/* 7. Registration Date */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-stone-700 block">7. Registration Date</label>
                          <select
                            value={advRegDatePreset}
                            onChange={(e) => setAdvRegDatePreset(e.target.value)}
                            className="w-full bg-[#faf8f5] border border-stone-200 rounded-xl px-3 py-2 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                          >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="currentmonth">Current Month</option>
                            <option value="custom">Custom Date Range</option>
                          </select>
                          {advRegDatePreset === 'custom' && (
                            <div className="grid grid-cols-2 gap-2 pt-1.5">
                              <input
                                type="date"
                                value={advRegStartDate}
                                onChange={(e) => setAdvRegStartDate(e.target.value)}
                                className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
                              />
                              <input
                                type="date"
                                value={advRegEndDate}
                                onChange={(e) => setAdvRegEndDate(e.target.value)}
                                className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
                              />
                            </div>
                          )}
                        </div>

                        {/* 8. Product Requirement */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-stone-700 block">8. Product Requirement</label>
                          <input
                            type="text"
                            value={advProductReq}
                            onChange={(e) => setAdvProductReq(e.target.value)}
                            placeholder="Filter by product (e.g. Sofa, Mandir, Bed, Wardrobe)..."
                            className="w-full bg-[#faf8f5] border border-stone-200 rounded-xl px-3 py-2 font-medium text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                          />
                        </div>

                        {/* 9 & 10. Order Count + Preferred Contact Method */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="font-bold text-stone-700 block">9. Order Count</label>
                            <select
                              value={advOrderCount}
                              onChange={(e) => setAdvOrderCount(e.target.value)}
                              className="w-full bg-[#faf8f5] border border-stone-200 rounded-xl px-3 py-2 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                            >
                              <option value="all">Any Count</option>
                              <option value="0">0 Orders</option>
                              <option value="1">1 Order</option>
                              <option value="2_plus">2+ Orders</option>
                              <option value="3_plus">3+ Orders</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-stone-700 block">10. Preferred Reach</label>
                            <select
                              value={advContactMethod}
                              onChange={(e) => setAdvContactMethod(e.target.value)}
                              className="w-full bg-[#faf8f5] border border-stone-200 rounded-xl px-3 py-2 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                            >
                              <option value="all">All Methods</option>
                              <option value="WhatsApp">WhatsApp</option>
                              <option value="Phone">Phone</option>
                              <option value="Email">Email</option>
                            </select>
                          </div>
                        </div>

                        {/* 11. Follow-up Status */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-stone-700 block">11. Follow-up Status</label>
                          <select
                            value={advFollowUpStatus}
                            onChange={(e) => setAdvFollowUpStatus(e.target.value)}
                            className="w-full bg-[#faf8f5] border border-stone-200 rounded-xl px-3 py-2 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                          >
                            <option value="all">All Follow-up Statuses</option>
                            <option value="pending">Has Pending Follow-up</option>
                            <option value="overdue_today">Due Today / Overdue</option>
                            <option value="completed">Completed Only</option>
                            <option value="none">No Follow-ups Logged</option>
                          </select>
                        </div>
                      </div>

                      <div className="px-5 py-4 border-t border-stone-200 bg-[#faf8f5] flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={clearAllDirectoryFilters}
                          className="px-4 py-2 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer transition"
                        >
                          Reset All
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowFilterDrawer(false)}
                          className="flex-1 bg-[#4a2c1b] hover:bg-[#382114] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                        >
                          Show {filteredCustomersList.length} Result{filteredCustomersList.length === 1 ? '' : 's'}
                        </button>
                      </div>
                    </div>
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
                                const qImages = (q.items || [])
                                  .flatMap(i =>
                                    (i.images || []).map((img: any) =>
                                      typeof img === 'string' ? img : (img?.url || '')
                                    )
                                  )
                                  .filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
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
                                              referrerPolicy="no-referrer"
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
                                        q.status === 'INVOICED' || q.status === 'Invoiced' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                        q.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                        q.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                                        'bg-amber-100 text-amber-700'
                                      }`}>
                                        {q.status}
                                      </span>
                                      {(q.status === 'INVOICED' || q.status === 'Invoiced') && hasWriteAccess && (
                                        <button
                                          onClick={() => handleConvertQuotationToOrder(q)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded transition"
                                          title="Approve & Convert to Production Order"
                                        >
                                          <FileCheck size={12} />
                                        </button>
                                      )}
                                      {(q.status === 'Sent' || q.status === 'Draft') && hasWriteAccess && (
                                        <button
                                          onClick={() => handleGenerateInvoiceForQuotation(q)}
                                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 p-1 rounded transition"
                                          title="Generate Invoice (Unlocks Approve & Convert)"
                                        >
                                          <Receipt size={12} />
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
                            selectedCustAttachments.map(att => {
                              const isImgAtt =
                                Boolean(att.url) &&
                                (att.url.startsWith('data:image/') ||
                                  att.fileType?.startsWith('image/') ||
                                  /\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/i.test(att.url));
                              const isDataUrl = Boolean(att.url?.startsWith('data:'));

                              return (
                                <div key={att.id} className="bg-stone-50 border border-stone-200 p-3 rounded-xl flex items-center justify-between shadow-xs">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {isImgAtt ? (
                                      <img
                                        src={att.url}
                                        referrerPolicy="no-referrer"
                                        alt={att.fileName}
                                        onClick={() => setPreviewImageModalUrl(att.url)}
                                        className="h-9 w-9 rounded-lg border border-stone-200 object-cover shrink-0 bg-white cursor-pointer hover:scale-105 transition"
                                        title="Click to preview image"
                                      />
                                    ) : (
                                      <div className="h-9 w-9 bg-amber-100 rounded-lg flex items-center justify-center text-[#593622] shrink-0">
                                        <FileSpreadsheet size={16} />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <strong className="text-xs text-stone-900 block truncate font-bold">{att.fileName}</strong>
                                      <span className="text-[10px] text-stone-400 font-mono block uppercase tracking-wider">{att.fileCategory}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {isImgAtt && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewImageModalUrl(att.url)}
                                        className="bg-white hover:bg-stone-100 border border-stone-200 p-1.5 rounded-lg text-stone-600 hover:text-stone-900 transition cursor-pointer"
                                        title="Preview image"
                                      >
                                        <Eye size={12} />
                                      </button>
                                    )}
                                    <a
                                      href={att.url}
                                      {...(isDataUrl
                                        ? { download: att.fileName || 'attachment' }
                                        : { target: '_blank', rel: 'noreferrer' })}
                                      className="bg-white hover:bg-stone-100 border border-stone-200 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 transition"
                                      title={isDataUrl ? 'Download file' : 'Open link'}
                                    >
                                      {isDataUrl ? <Download size={12} /> : <Link size={12} />}
                                    </a>
                                    {hasWriteAccess && (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteCRMAttachment(att.id)}
                                        className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
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

      {/* SUBTAB: QUOTATIONS MANAGEMENT (Approved Stitch Redesign) */}
      {subTab === 'quotations' && (
        <div className="space-y-4">
          {/* 1. Page Heading, Breadcrumb & Right Utility Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
            <div>
              <nav aria-label="Breadcrumb" className="text-[11px] font-semibold text-stone-500 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubTab('dashboard')}
                  className="hover:text-[#4a2c1b] transition cursor-pointer"
                >
                  CRM
                </button>
                <span className="text-stone-300">/</span>
                <span>Commercial Funnel</span>
                <span className="text-stone-300">/</span>
                <span className="text-stone-900 font-bold">Quotations Management</span>
              </nav>
              <h2 className="text-xl sm:text-2xl font-black font-display text-stone-900 tracking-tight mt-0.5">
                Quotations Management
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Manage quotations, track approvals, monitor validity, generate invoices and track production conversion.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => handleExportQuotationsCSV(filteredEnrichedQuotations, 'bhisez_quotations_export')}
                className="bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer whitespace-nowrap"
              >
                <Download size={14} className="text-stone-500" />
                <span>Export CSV</span>
              </button>

              {hasWriteAccess && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedQuoteIds.length === 0) {
                      setQuoteNoticeMsg('Select one or more quotations using the checkboxes below to unlock Bulk Actions.');
                    } else {
                      setQuoteNoticeMsg(null);
                    }
                  }}
                  className={`border px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition cursor-pointer whitespace-nowrap ${
                    selectedQuoteIds.length > 0
                      ? 'bg-[#4a2c1b] border-[#4a2c1b] text-white'
                      : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                >
                  <Layers size={14} />
                  <span>Bulk Actions</span>
                  {selectedQuoteIds.length > 0 && (
                    <span className="bg-[#e05e00] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full tabular-nums leading-none">
                      {selectedQuoteIds.length} Selected
                    </span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowQuoteAuditLogModal(true)}
                className="bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer whitespace-nowrap"
              >
                <History size={14} className="text-stone-500" />
                <span>Audit Log</span>
              </button>
            </div>
          </div>

          {/* Inline subtle feedback banner (dismissible) */}
          {quoteNoticeMsg && (
            <div className="bg-amber-50/90 border border-amber-200 text-amber-900 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-amber-700 shrink-0" />
                <span>{quoteNoticeMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setQuoteNoticeMsg(null)}
                className="text-amber-700 hover:text-amber-950 p-0.5 rounded cursor-pointer"
                aria-label="Dismiss notice"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* 2. Horizontal Quotation Status Navigation Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                {
                  id: 'all' as QuotationStatusTab,
                  label: 'All Quotations',
                  count: quotationTabCounts.all,
                  activeBadge: 'bg-white/20 text-white',
                  inactiveBadge: 'bg-stone-100 text-stone-700',
                },
                {
                  id: 'draft' as QuotationStatusTab,
                  label: 'Draft',
                  count: quotationTabCounts.draft,
                  activeBadge: 'bg-amber-400 text-stone-950',
                  inactiveBadge: 'bg-amber-50 text-amber-800 border border-amber-200/80',
                },
                {
                  id: 'sent' as QuotationStatusTab,
                  label: 'Sent',
                  count: quotationTabCounts.sent,
                  activeBadge: 'bg-blue-400 text-stone-950',
                  inactiveBadge: 'bg-blue-50 text-blue-700 border border-blue-200/80',
                },
                {
                  id: 'approved' as QuotationStatusTab,
                  label: 'Approved',
                  count: quotationTabCounts.approved,
                  activeBadge: 'bg-emerald-400 text-stone-950',
                  inactiveBadge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
                },
                {
                  id: 'invoiced' as QuotationStatusTab,
                  label: 'Invoiced',
                  count: quotationTabCounts.invoiced,
                  activeBadge: 'bg-purple-300 text-stone-950',
                  inactiveBadge: 'bg-purple-50 text-purple-700 border border-purple-200/80',
                },
                {
                  id: 'in_production' as QuotationStatusTab,
                  label: 'In Production',
                  count: quotationTabCounts.in_production,
                  activeBadge: 'bg-orange-400 text-stone-950',
                  inactiveBadge: 'bg-orange-50 text-[#e05e00] border border-orange-200/80',
                },
              ].map((tab) => {
                const isActive = quoteStatusTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setQuoteStatusTab(tab.id)}
                    className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
                      isActive
                        ? 'bg-[#4a2c1b] border-[#4a2c1b] text-white shadow-xs'
                        : 'bg-white border-stone-200/90 text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                        isActive ? tab.activeBadge : tab.inactiveBadge
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-stone-500 flex items-center gap-1.5 pl-0.5">
              <Info size={12} className="text-stone-400 shrink-0" />
              <span>
                Note: Invoiced and In Production states reflect linked downstream order milestones and may overlap with quotation approval status.
              </span>
            </p>
          </div>

          {/* 3. Search & Advanced Filter Toolbar */}
          <div className="bg-white border border-stone-200/90 p-3 rounded-2xl shadow-xs space-y-2.5">
            <div className="flex flex-col xl:flex-row gap-2.5 items-stretch xl:items-center justify-between">
              {/* Search input */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                <input
                  type="text"
                  value={quoteSearch}
                  onChange={(e) => setQuoteSearch(e.target.value)}
                  placeholder="Search by quotation ID, customer name, mobile number or product..."
                  className="w-full pl-10 pr-8 py-2 bg-[#faf8f5] border border-stone-200 rounded-xl text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#4a2c1b] transition"
                />
                {quoteSearch && (
                  <button
                    type="button"
                    onClick={() => setQuoteSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Quick Filter Dropdowns */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <select
                  value={quoteDatePreset}
                  onChange={(e) => setQuoteDatePreset(e.target.value as QuotationDatePreset)}
                  aria-label="Filter by created date"
                  className="bg-white border border-stone-200 hover:border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:border-[#4a2c1b] cursor-pointer"
                >
                  <option value="all">Created: All Time</option>
                  <option value="today">Created: Today</option>
                  <option value="7days">Created: Last 7 Days</option>
                  <option value="30days">Created: Last 30 Days</option>
                  <option value="this_month">Created: This Month</option>
                  <option value="custom">Created: Custom Range</option>
                </select>

                <select
                  value={quoteValidityFilter}
                  onChange={(e) => setQuoteValidityFilter(e.target.value as QuotationValidityFilter)}
                  aria-label="Filter by validity"
                  className="bg-white border border-stone-200 hover:border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:border-[#4a2c1b] cursor-pointer"
                >
                  <option value="all">Validity: All</option>
                  <option value="active">Validity: Active / Valid</option>
                  <option value="expiring_soon">Validity: Expiring Soon (≤7d)</option>
                  <option value="expired">Validity: Expired</option>
                  <option value="draft_review">Validity: Draft Review</option>
                </select>

                <select
                  value={quoteAmountRange}
                  onChange={(e) => setQuoteAmountRange(e.target.value as QuotationAmountRange)}
                  aria-label="Filter by amount range"
                  className="bg-white border border-stone-200 hover:border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:border-[#4a2c1b] cursor-pointer"
                >
                  <option value="all">₹ Amount Range: All</option>
                  <option value="under_50k">Under ₹50,000</option>
                  <option value="50k_150k">₹50,000 – ₹1,50,000</option>
                  <option value="above_150k">Above ₹1,50,000</option>
                  <option value="custom">Custom Amount Range</option>
                </select>

                <select
                  value={quoteSortBy}
                  onChange={(e) => setQuoteSortBy(e.target.value as QuotationSortBy)}
                  aria-label="Sort quotations"
                  className="bg-white border border-stone-200 hover:border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:border-[#4a2c1b] cursor-pointer"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="highest_value">Sort: Highest Value</option>
                  <option value="lowest_value">Sort: Lowest Value</option>
                  <option value="expiring_soon">Sort: Expiring Soon</option>
                </select>
              </div>
            </div>

            {/* Bottom Utility Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowQuoteAdvFilters((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition cursor-pointer ${
                    showQuoteAdvFilters || activeQuoteAdvFilterCount > 0
                      ? 'bg-[#f4ece6] border-[#4a2c1b]/40 text-[#4a2c1b]'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Filter size={13} />
                  <span>Advanced Filters</span>
                  {(activeQuoteAdvFilterCount > 0 || showQuoteAdvFilters) && (
                    <span className="w-2 h-2 rounded-full bg-[#e05e00]" />
                  )}
                </button>

                {hasAnyQuoteFilterActive && (
                  <button
                    type="button"
                    onClick={clearAllQuotationFilters}
                    className="text-xs font-bold text-stone-600 hover:text-[#e05e00] underline underline-offset-2 cursor-pointer transition"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="text-xs font-medium text-stone-500 tabular-nums">
                Showing <strong className="text-stone-900 font-bold">{filteredEnrichedQuotations.length}</strong> quotation{filteredEnrichedQuotations.length === 1 ? '' : 's'}
              </div>
            </div>

            {/* Expandable Advanced Filters Panel */}
            {(showQuoteAdvFilters || quoteDatePreset === 'custom' || quoteAmountRange === 'custom') && (
              <div className="pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs bg-[#faf8f5]/80 p-3 rounded-xl">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    Quotation Status
                  </label>
                  <select
                    value={quoteAdvQuoteStatus}
                    onChange={(e) => setQuoteAdvQuoteStatus(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="INVOICED">INVOICED</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    Invoice / Payment Status
                  </label>
                  <select
                    value={quoteAdvInvoiceStatus}
                    onChange={(e) => setQuoteAdvInvoiceStatus(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                  >
                    <option value="all">Any Invoice State</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="not_invoiced">Not Invoiced Yet</option>
                    <option value="received_amount">Received Amount</option>
                    <option value="balance_amount">Balance Amount</option>
                    <option value="partial">Partial Payment</option>
                    <option value="fully_paid">Fully Paid</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    Production Conversion
                  </label>
                  <select
                    value={quoteAdvProductionStatus}
                    onChange={(e) => setQuoteAdvProductionStatus(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 font-semibold text-stone-800 focus:outline-none focus:border-[#4a2c1b]"
                  >
                    <option value="all">All Quotations</option>
                    <option value="in_production">Linked to Production Order</option>
                    <option value="not_converted">No Linked Order Yet</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    Created Date From / To
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="date"
                      value={quoteCustomStartDate}
                      onChange={(e) => {
                        setQuoteCustomStartDate(e.target.value);
                        setQuoteDatePreset('custom');
                      }}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px] font-mono"
                    />
                    <input
                      type="date"
                      value={quoteCustomEndDate}
                      onChange={(e) => {
                        setQuoteCustomEndDate(e.target.value);
                        setQuoteDatePreset('custom');
                      }}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    Min / Max Value (₹)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      min={0}
                      placeholder="Min ₹"
                      value={quoteCustomMinAmt}
                      onChange={(e) => {
                        setQuoteCustomMinAmt(e.target.value);
                        setQuoteAmountRange('custom');
                      }}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px] font-mono"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Max ₹"
                      value={quoteCustomMaxAmt}
                      onChange={(e) => {
                        setQuoteCustomMaxAmt(e.target.value);
                        setQuoteAmountRange('custom');
                      }}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px] font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Conditional Bulk Action Toolbar (STRICTLY HIDDEN when 0 selected) */}
          {selectedQuoteIds.length > 0 && hasWriteAccess && (
            <div className="bg-[#2c1a0e] text-white rounded-2xl px-4 py-2.5 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3 border border-[#4a2c1b]">
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <div className="flex items-center gap-2 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e05e00] shrink-0" />
                  <span className="tabular-nums">
                    {selectedEnrichedQuotes.length} Quotation{selectedEnrichedQuotes.length === 1 ? '' : 's'} Selected
                  </span>
                </div>
                <span className="text-white/30 hidden sm:inline">|</span>
                <span className="text-stone-300 font-medium tabular-nums">
                  Total Selected Value:{' '}
                  <strong className="text-white font-mono font-bold">
                    ₹{selectedTotalValue.toLocaleString('en-IN')}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap relative">
                <button
                  type="button"
                  onClick={() => handleExportQuotationsCSV(selectedEnrichedQuotes, 'bhisez_selected_quotations')}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                >
                  <Download size={13} />
                  <span>Export Selected</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBulkStatusMenu((v) => !v)}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    <span>Change Status</span>
                    <ChevronDown size={13} />
                  </button>
                  {showBulkStatusMenu && (
                    <div className="absolute right-0 mt-1.5 w-48 bg-white text-stone-800 rounded-xl shadow-xl border border-stone-200 py-1 z-30 text-xs">
                      <button
                        type="button"
                        onClick={() => handleBulkChangeStatus('Sent')}
                        className="w-full text-left px-3 py-2 hover:bg-stone-50 font-semibold flex items-center justify-between cursor-pointer"
                      >
                        <span>Mark Draft → Sent</span>
                        <Send size={12} className="text-blue-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkChangeStatus('Rejected')}
                        className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-700 font-semibold flex items-center justify-between cursor-pointer"
                      >
                        <span>Mark Draft/Sent → Rejected</span>
                        <XCircle size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleBulkGenerateInvoices}
                  className="bg-[#e05e00] hover:bg-[#c75300] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Receipt size={13} />
                  <span>Generate Invoices</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkDeleteQuotations}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedQuoteIds([]);
                    setShowBulkStatusMenu(false);
                  }}
                  className="text-stone-300 hover:text-white px-2.5 py-1.5 text-xs font-bold underline underline-offset-2 cursor-pointer whitespace-nowrap"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* 5. Redesigned Full-Visibility Quotations Table */}
          <div className="bg-white border border-stone-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#faf8f5] border-b border-stone-200 text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      {hasWriteAccess && (
                        <input
                          type="checkbox"
                          checked={allPageQuotesSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = somePageQuotesSelected;
                          }}
                          onChange={toggleSelectAllOnQuotePage}
                          aria-label="Select all quotations on this page"
                          className="w-4 h-4 rounded border-stone-300 accent-[#e05e00] cursor-pointer align-middle"
                        />
                      )}
                    </th>
                    <th className="py-3 px-3 whitespace-nowrap">Quotation ID</th>
                    <th className="py-3 px-3 whitespace-nowrap">Customer Lead</th>
                    <th className="py-3 px-3 whitespace-nowrap">Product Items Included</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Total Qty</th>
                    <th className="py-3 px-3 whitespace-nowrap">Created Date</th>
                    <th className="py-3 px-3 whitespace-nowrap">Valid Until</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Estimated / Grand Total</th>
                    <th className="py-3 px-3 whitespace-nowrap">Current Status</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap sticky right-0 bg-[#faf8f5] shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.06)] z-10">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                  {paginatedQuotations.length > 0 ? (
                    paginatedQuotations.map((item) => {
                      const { quote } = item;
                      const isSelected = selectedQuoteSet.has(quote.id);
                      const firstPhoto = item.images[0];

                      const statusBadgeMeta = (() => {
                        if (item.isApproved) {
                          return {
                            label: 'Approved',
                            cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            dot: 'bg-emerald-500',
                          };
                        }
                        if (quote.status === 'INVOICED' || quote.status === 'Invoiced') {
                          return {
                            label: 'Invoiced',
                            cls: 'bg-purple-50 text-purple-800 border-purple-200',
                            dot: 'bg-purple-500',
                          };
                        }
                        if (item.isSent) {
                          return {
                            label: 'Sent',
                            cls: 'bg-blue-50 text-blue-700 border-blue-200',
                            dot: 'bg-blue-500',
                          };
                        }
                        if (item.isDraft) {
                          return {
                            label: 'Draft',
                            cls: 'bg-amber-50 text-amber-800 border-amber-200',
                            dot: 'bg-amber-500',
                          };
                        }
                        if (item.isRejected) {
                          return {
                            label: 'Rejected',
                            cls: 'bg-rose-50 text-rose-700 border-rose-200',
                            dot: 'bg-rose-500',
                          };
                        }
                        return {
                          label: quote.status || 'Draft',
                          cls: 'bg-stone-100 text-stone-700 border-stone-200',
                          dot: 'bg-stone-400',
                        };
                      })();

                      const validityPillClass = (() => {
                        switch (item.validity.state) {
                          case 'expired':
                            return 'bg-rose-50 text-rose-700 border-rose-200';
                          case 'expiring_soon':
                            return 'bg-amber-50 text-amber-800 border-amber-200';
                          case 'draft_review':
                            return 'bg-amber-50/70 text-amber-700 border-amber-200/80';
                          case 'valid':
                            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          default:
                            return 'bg-stone-100 text-stone-600 border-stone-200';
                        }
                      })();

                      return (
                        <tr
                          key={quote.id}
                          className={`group transition ${
                            isSelected ? 'bg-orange-50/40 hover:bg-orange-50/70' : 'hover:bg-[#faf8f5]/80'
                          }`}
                        >
                          {/* 1. Checkbox */}
                          <td className="py-3 px-3 text-center align-middle">
                            {hasWriteAccess && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectQuote(quote.id)}
                                aria-label={`Select quotation ${quote.id}`}
                                className="w-4 h-4 rounded border-stone-300 accent-[#e05e00] cursor-pointer align-middle"
                              />
                            )}
                          </td>

                          {/* 2. Quotation ID */}
                          <td className="py-3 px-3 whitespace-nowrap align-middle">
                            <button
                              type="button"
                              onClick={() => setViewingEstimateQuote(quote)}
                              className="font-mono font-bold text-[#4a2c1b] hover:text-[#e05e00] transition cursor-pointer text-left"
                              title="Open Quotation / Invoice Receipt"
                            >
                              {quote.id}
                            </button>
                          </td>

                          {/* 3. Customer Lead */}
                          <td className="py-3 px-3 min-w-[160px] max-w-[205px] align-middle">
                            <div className="font-bold text-stone-900 truncate" title={item.customerName}>
                              {item.customerName}
                            </div>
                            <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {item.customerPhone && (
                                <span className="font-mono tabular-nums">{item.customerPhone}</span>
                              )}
                              {item.customerSource && (
                                <span className="bg-stone-100 border border-stone-200/80 text-stone-600 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                                  {item.customerSource}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Product Items Included */}
                          <td className="py-3 px-3 min-w-[220px] max-w-[290px] align-middle">
                            <div className="flex items-center gap-2.5">
                              {firstPhoto ? (
                                <img
                                  src={firstPhoto}
                                  alt={item.firstItemTitle}
                                  referrerPolicy="no-referrer"
                                  onClick={() => setPreviewImageModalUrl(firstPhoto)}
                                  title="Click to inspect product photo"
                                  className="w-9 h-9 rounded-lg border border-stone-200 object-cover shrink-0 bg-stone-50 cursor-pointer hover:scale-105 transition"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg border border-stone-200 bg-[#faf8f5] text-[#593622]/70 flex items-center justify-center shrink-0">
                                  <Package size={15} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="font-bold text-stone-900 truncate"
                                    title={item.itemsSummary}
                                  >
                                    {item.firstItemTitle}
                                  </span>
                                  {item.itemsCount > 1 && (
                                    <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 tabular-nums">
                                      +{item.itemsCount - 1} more
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-stone-500 truncate mt-0.5" title={item.firstItemSpecs}>
                                  {item.firstItemSpecs}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 5. Total Quantity */}
                          <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-bold text-stone-800 tabular-nums align-middle">
                            {item.totalQty}
                          </td>

                          {/* 6. Created Date */}
                          <td className="py-3 px-3 whitespace-nowrap text-stone-700 font-medium tabular-nums align-middle">
                            {formatShortDateLabel(quote.created_at)}
                          </td>

                          {/* 7. Valid Until + Validity Indicator */}
                          <td className="py-3 px-3 whitespace-nowrap align-middle">
                            <div
                              className={`font-semibold tabular-nums ${
                                item.validity.state === 'expired' ? 'text-rose-700' : 'text-stone-800'
                              }`}
                            >
                              {formatShortDateLabel(quote.validUntil)}
                            </div>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border tabular-nums ${validityPillClass}`}
                            >
                              {item.validity.label}
                            </span>
                          </td>

                          {/* 8. Estimated / Grand Total Value */}
                          <td className="py-3 px-3 text-right whitespace-nowrap align-middle">
                            <div className="font-mono font-extrabold text-stone-950 text-[13px] tabular-nums">
                              ₹{item.totalAmount.toLocaleString('en-IN')}
                            </div>
                            {(() => {
                              const paymentDisplay = getQuotationPaymentDisplay(item, quoteAdvInvoiceStatus);
                              if (!paymentDisplay) return null;
                              return (
                                <div
                                  className={`text-[10px] font-mono font-semibold tabular-nums mt-0.5 ${
                                    paymentDisplay.tone === 'red' ? 'text-red-600' : 'text-emerald-700'
                                  }`}
                                >
                                  {paymentDisplay.formatted}
                                </div>
                              );
                            })()}
                          </td>

                          {/* 9. Current Status + Linked Order/Invoice Badge */}
                          <td className="py-3 px-3 whitespace-nowrap align-middle">
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadgeMeta.cls}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadgeMeta.dot}`} />
                                <span>{statusBadgeMeta.label}</span>
                              </span>
                              {item.linkedOrders.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onViewOrder) {
                                      onViewOrder(item.linkedOrders[0].id);
                                    }
                                  }}
                                  title={`Linked production order(s): ${item.linkedOrderLabels.join(', ')}`}
                                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-50 text-[#e05e00] border border-orange-200/80 ${
                                    onViewOrder ? 'hover:bg-orange-100 cursor-pointer' : ''
                                  }`}
                                >
                                  <span>
                                    {item.linkedOrders.length === 1
                                      ? item.linkedOrderLabels[0]
                                      : `${item.linkedOrders.length} Orders (${item.linkedOrderLabels[0]})`}
                                  </span>
                                  {onViewOrder && <ExternalLink size={10} />}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 10. Business-Rule-Gated Actions (Sticky right to prevent clipping) */}
                          <td
                            className={`py-3 px-3 whitespace-nowrap text-right align-middle sticky right-0 z-10 shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.06)] ${
                              isSelected ? 'bg-[#fff7f0] group-hover:bg-[#ffefe2]' : 'bg-white group-hover:bg-[#faf8f5]'
                            }`}
                          >
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {/* Draft: Send (or Generate Invoice icon) */}
                              {item.isDraft && hasWriteAccess && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleMarkQuotationSent(quote)}
                                    className="bg-[#4a2c1b] hover:bg-[#382114] text-white px-2.5 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                    title="Mark quotation as Sent to customer"
                                  >
                                    <Send size={11} />
                                    <span>Send</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateInvoiceForQuotation(quote)}
                                    className="bg-orange-50 hover:bg-orange-100 text-[#e05e00] border border-orange-200 px-2 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
                                    title="Generate Invoice (sets status to INVOICED)"
                                  >
                                    <Receipt size={11} />
                                    <span className="hidden 2xl:inline">Invoice</span>
                                  </button>
                                </>
                              )}

                              {/* Sent: Generate Invoice */}
                              {item.isSent && !item.isInvoiced && hasWriteAccess && (
                                <button
                                  type="button"
                                  onClick={() => handleGenerateInvoiceForQuotation(quote)}
                                  className="bg-[#e05e00] hover:bg-[#c75300] text-white px-2.5 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                  title="Generate Invoice (unlocks Approve & Convert)"
                                >
                                  <Receipt size={11} />
                                  <span>Generate Invoice</span>
                                </button>
                              )}

                              {/* INVOICED (not yet Approved): Approve & Convert (NO Generate Invoice button!) */}
                              {!item.isApproved &&
                                (quote.status === 'INVOICED' || quote.status === 'Invoiced') &&
                                hasWriteAccess && (
                                  <button
                                    type="button"
                                    onClick={() => handleConvertQuotationToOrder(quote)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                    title="Approve & Convert to Production Order"
                                  >
                                    <FileCheck size={11} />
                                    <span>Approve & Convert</span>
                                  </button>
                                )}

                              {/* Approved + Linked Production Order: View Order */}
                              {item.isApproved && item.linkedOrders.length > 0 && onViewOrder && (
                                <button
                                  type="button"
                                  onClick={() => onViewOrder(item.linkedOrders[0].id)}
                                  className="bg-stone-100 hover:bg-stone-200 text-[#4a2c1b] border border-stone-200 px-2.5 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
                                  title={`Open linked order ${item.linkedOrderLabels[0]}`}
                                >
                                  <ExternalLink size={11} />
                                  <span>View Order</span>
                                </button>
                              )}

                              {/* Approved without linked order yet */}
                              {item.isApproved && item.linkedOrders.length === 0 && hasWriteAccess && (
                                <button
                                  type="button"
                                  onClick={() => handleConvertQuotationToOrder(quote)}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
                                  title="Open Detail Order Form"
                                >
                                  <FileCheck size={11} />
                                  <span>Order Form</span>
                                </button>
                              )}

                              {/* View Quotation / Invoice Receipt */}
                              <button
                                type="button"
                                onClick={() => setViewingEstimateQuote(quote)}
                                className="p-1.5 rounded-lg text-stone-600 hover:text-[#4a2c1b] hover:bg-stone-100 transition cursor-pointer"
                                title={item.isInvoiced ? 'View Invoice / Estimate' : 'View Quotation'}
                              >
                                <Eye size={14} />
                              </button>

                              {/* Edit Quotation */}
                              {hasWriteAccess && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingQuotation(quote);
                                    setShowAddQuoteModal(true);
                                  }}
                                  className="p-1.5 rounded-lg text-stone-600 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                                  title="Edit Quotation"
                                >
                                  <Edit size={14} />
                                </button>
                              )}

                              {/* Mark Rejected (Sent only) */}
                              {item.isSent && hasWriteAccess && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Mark Quotation ${quote.id} as Rejected?`)) {
                                      onSaveCRMQuotation({ ...quote, status: 'Rejected' });
                                      onSaveCRMTimelineEvent({
                                        id: generateId('evt'),
                                        customer_id: quote.customer_id,
                                        type: 'status_change',
                                        title: 'Quotation Marked Rejected',
                                        description: `Quotation ${quote.id} marked Rejected.`,
                                        timestamp: new Date().toISOString(),
                                        operator: currentUser.name,
                                      });
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Mark Rejected"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}

                              {/* Delete Quotation */}
                              {hasWriteAccess && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Delete quotation ${quote.id} permanently?`)) {
                                      onDeleteCRMQuotation(quote.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Delete Quotation"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-12 text-center">
                        <div className="max-w-sm mx-auto space-y-2.5">
                          <FileText size={32} className="mx-auto text-stone-300" />
                          <p className="text-stone-800 font-bold text-sm">
                            No quotations matched your active filters
                          </p>
                          <p className="text-stone-500 text-xs">
                            {enrichedQuotations.length === 0
                              ? 'Create your first customer quotation to begin tracking estimates, invoices, and orders.'
                              : 'Try clearing or adjusting your search term, status tab, date range, or amount filters.'}
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            {hasAnyQuoteFilterActive && (
                              <button
                                type="button"
                                onClick={clearAllQuotationFilters}
                                className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition"
                              >
                                Clear Filters
                              </button>
                            )}
                            {hasWriteAccess && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingQuotation(null);
                                  setShowAddQuoteModal(true);
                                }}
                                className="bg-[#e05e00] hover:bg-[#c75300] text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                              >
                                <Plus size={14} /> New Quotation
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 6. Pagination & Rows-per-page Controls */}
            {filteredEnrichedQuotations.length > 0 && (
              <div className="bg-[#faf8f5] border-t border-stone-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-medium tabular-nums">
                    Showing{' '}
                    <strong className="text-stone-900">
                      {(safeQuotePage - 1) * quotePageSize + 1}
                    </strong>{' '}
                    to{' '}
                    <strong className="text-stone-900">
                      {Math.min(safeQuotePage * quotePageSize, filteredEnrichedQuotations.length)}
                    </strong>{' '}
                    of <strong className="text-stone-900">{filteredEnrichedQuotations.length}</strong> quotations
                  </span>

                  <label className="inline-flex items-center gap-2 font-medium">
                    <span>Rows per page:</span>
                    <select
                      value={quotePageSize}
                      onChange={(e) => setQuotePageSize(Number(e.target.value))}
                      className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#4a2c1b] cursor-pointer tabular-nums"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </label>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeQuotePage <= 1}
                    onClick={() => setQuotePage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    Previous
                  </button>
                  {quotePaginationNumbers.map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`qell_${idx}`} className="px-2 text-stone-400 font-bold">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQuotePage(item)}
                        className={`min-w-[30px] h-[30px] px-2 rounded-lg text-xs font-bold tabular-nums transition cursor-pointer ${
                          safeQuotePage === item
                            ? 'bg-[#4a2c1b] text-white shadow-xs'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    disabled={safeQuotePage >= totalQuotePages}
                    onClick={() => setQuotePage((p) => Math.min(totalQuotePages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUOTATIONS AUDIT LOG DRAWER / MODAL */}
      {showQuoteAuditLogModal && (
        <div className="fixed inset-0 z-[75] flex justify-end bg-black/40 backdrop-blur-[1px]">
          <div className="flex-1" onClick={() => setShowQuoteAuditLogModal(false)} />
          <div className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-stone-200 flex flex-col">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-[#faf8f5]">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#4a2c1b] text-white flex items-center justify-center">
                  <History size={15} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-stone-900">Quotations Audit Log</h3>
                  <p className="text-[11px] text-stone-500">
                    Real-time quotation, invoice generation & conversion trail ({filteredQuotationAuditEntries.length} events)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuoteAuditLogModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-stone-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                <input
                  type="text"
                  value={quoteAuditSearch}
                  onChange={(e) => setQuoteAuditSearch(e.target.value)}
                  placeholder="Search audit events by QT ID, action or user..."
                  className="w-full pl-9 pr-3 py-2 bg-[#faf8f5] border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-[#4a2c1b]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-xs">
              {filteredQuotationAuditEntries.length > 0 ? (
                filteredQuotationAuditEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-[#faf8f5] border border-stone-200/80 rounded-xl p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-stone-900">{entry.title}</span>
                      <span className="text-[10px] font-mono text-stone-500 tabular-nums shrink-0">
                        {formatToDDMMYYYY(entry.timestamp)}{' '}
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">{entry.description}</p>
                    <div className="text-[10px] font-mono text-stone-400 uppercase pt-0.5">
                      BY {entry.operator}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-14 text-stone-400 space-y-1.5">
                  <History size={28} className="mx-auto text-stone-300" />
                  <p className="text-xs font-bold text-stone-600">No matching quotation audit events</p>
                  <p className="text-[11px]">
                    Events are recorded automatically whenever quotations are issued, invoiced, or approved.
                  </p>
                </div>
              )}
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[70] p-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-600">Source *</label>
                  <select
                    name="source"
                    defaultValue={editingCustomer?.source || 'Walkin'}
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-bold"
                  >
                    <option value="Walkin">Walkin</option>
                    <option value="IndiaMART">IndiaMART</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Website">Website</option>
                    <option value="Reference">Reference</option>
                    <option value="TradeIndia">TradeIndia</option>
                    <option value="Youtube">Youtube</option>
                    <option value="Email">Email</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-600">Preferred Reach</label>
                  <select
                    name="preferredContactMethod"
                    defaultValue={editingCustomer?.preferredContactMethod || 'WhatsApp'}
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none font-bold"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Phone">Phone</option>
                    <option value="Email">Email</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-600">Email Address (Optional)</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingCustomer?.email || ''}
                  placeholder="e.g. client@example.com"
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 focus:outline-none"
                />
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
                                <ImageIcon size={14} className="text-[#593622]" /> Upload Product Photos
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
                              <div className="space-y-2 pt-2 border-t border-stone-200/60 mt-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                                    <span>Attached Photos ({item.images.length})</span>
                                    <span className="text-[10px] text-stone-500 font-normal normal-case">
                                      — Each photo has its own independent description
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                  {item.images.map((photoItem, imgIdx) => {
                                    const imgSrc = typeof photoItem === 'string' ? photoItem : (photoItem?.url || '');
                                    const photoDesc = typeof photoItem === 'string' ? '' : (photoItem?.description || '');

                                    return (
                                      <div
                                        key={imgIdx}
                                        className="bg-white border border-stone-200 hover:border-amber-400 rounded-2xl p-3 shadow-2xs space-y-2.5 transition flex flex-col justify-between"
                                      >
                                        {/* Top Header Badge & Quick Actions */}
                                        <div className="flex items-center justify-between">
                                          <span className="bg-[#593622] text-white font-mono text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-2xs">
                                            Photo #{imgIdx + 1}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewImageModalUrl(imgSrc);
                                              }}
                                              className="p-1 text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer"
                                              title="Zoom Preview"
                                            >
                                              <Eye size={13} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveItemImage(idx, imgIdx);
                                              }}
                                              className="p-1 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                                              title="Remove Photo"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Image Preview */}
                                        <div
                                          className="relative w-full h-32 rounded-xl border border-stone-200 overflow-hidden bg-stone-50 flex items-center justify-center cursor-pointer group/img"
                                          onClick={() => setPreviewImageModalUrl(imgSrc)}
                                        >
                                          <img
                                            src={imgSrc}
                                            alt={`Product #${idx + 1} Photo #${imgIdx + 1}`}
                                            className="w-full h-full object-cover group-hover/img:scale-105 transition duration-200"
                                          />
                                          <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-[10px] text-white font-bold bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                                              <Eye size={12} /> View Large
                                            </span>
                                          </div>
                                        </div>

                                        {/* Photo Description Input */}
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-stone-700 block uppercase tracking-wider">
                                            Photo Description
                                          </label>
                                          <textarea
                                            value={photoDesc}
                                            onChange={(e) => handleUpdateItemPhotoDescription(idx, imgIdx, e.target.value)}
                                            placeholder="e.g. Sofa Cum Bed 03 with cushion and storage"
                                            rows={2}
                                            className="w-full text-xs bg-stone-50 border border-stone-200 focus:border-[#593622] focus:bg-white rounded-xl p-2 text-stone-800 focus:outline-none resize-none leading-relaxed transition font-normal"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
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
                            onClick={() => setQuotePaymentTerms('50% Advance on order confirmation, 50% before dispatch post-QC inspection.')}
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
                        placeholder="e.g. 50% Advance on order confirmation, 50% before dispatch post-QC inspection."
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
                  title="Save as Draft (Approve & Convert will remain hidden)"
                >
                  <span>Save as Draft</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('Sent')}
                  className="px-5 py-2.5 rounded-xl bg-[#593622] hover:bg-[#482b1b] text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
                  title="Issue Quotation (Approve & Convert will remain hidden until Invoiced)"
                >
                  <FileCheck size={15} />
                  <span>{editingQuotation ? 'Update Price Quotation' : 'Issue Quotation'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('INVOICED')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
                  title="Generate Invoice (Immediately activates Approve & Convert)"
                >
                  <Receipt size={15} />
                  <span>Generate Invoice</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 3. SCHEDULE FOLLOWUP MODAL */}
      {showAddFollowupModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[70] p-4">
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
                  {allAvailableCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id}) {c.phone ? `• ${c.phone}` : ''}</option>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[70] p-4">
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
        const activeQuote = db.crmQuotations?.find(q => q.id === viewingEstimateQuote.id) || viewingEstimateQuote;
        const handleUpdateField = (field: keyof CRMQuotation, value: any) => {
          if (!activeQuote) return;
          const updated = { ...activeQuote, [field]: value };
          setViewingEstimateQuote(updated);
          onSaveCRMQuotation(updated);
        };

        const customer = resolveQuotationCustomer(activeQuote, db.crmCustomers, db.customers);
        const itemsList = activeQuote.items || [];
        const itemSubtotal = itemsList.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
        const transportationCharges = Number(activeQuote.transportation_charges) || 0;
        const totalDiscount = (activeQuote.discount !== undefined && Number(activeQuote.discount) >= 0)
          ? Number(activeQuote.discount)
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

        const quoteDisplayId = activeQuote.id.startsWith('QT-') ? activeQuote.id : `QT-${activeQuote.id}`;
        const isInvoice = (activeQuote.received_amount || 0) > 0;
        const docTitle = isInvoice ? 'Invoice' : 'Estimate';
        const receivedAmt = Math.max(0, activeQuote.received_amount || 0);
        const balanceAmt = Math.max(0, activeQuote.totalAmount - receivedAmt);

        const upiPaymentString = buildUPIPaymentString({
          amount: balanceAmt,
          invoiceRef: quoteDisplayId,
          upiId: customUPIId || undefined,
          payeeName: customPayeeName || undefined,
        });
        const currentEffectiveUPIId = customUPIId && customUPIId.trim() ? customUPIId.trim() : UPI_CONFIG.upiId;
        const currentEffectivePayee = customPayeeName && customPayeeName.trim() ? customPayeeName.trim() : UPI_CONFIG.accountHolder;
        const appOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
        const onlinePaymentUrl = `${appOrigin}/?pay=gpay&am=${balanceAmt.toFixed(2)}&ref=${encodeURIComponent(quoteDisplayId)}&pa=${encodeURIComponent(currentEffectiveUPIId)}&pn=${encodeURIComponent(currentEffectivePayee)}`;
        const qrCodeUrl = customQR || generatedQRDataUrl || upiQrImg || getUPIQRCodeUrl(upiPaymentString, 280);

        const shareText = `Hello ${customer.name},\n\nPlease find the custom price ${docTitle} from *Bhisez Furniture*:\n\n*${docTitle} No:* ${quoteDisplayId}\n*Date:* ${formatToDDMMYYYY(activeQuote.created_at)}\n*Item:* ${firstItem?.furnitureItem || 'Bespoke Item'}\n*Specs:* ${firstItem?.dimensions || '-'}\n*Material:* ${firstItem?.material || '-'}\n*Quantity:* ${firstItem?.quantity || 1}\n*Grand Total:* ₹${activeQuote.totalAmount.toLocaleString('en-IN')}${receivedAmt > 0 ? `\n*Received Amount:* ₹${receivedAmt.toLocaleString('en-IN')}\n*Balance Amount:* ₹${balanceAmt.toLocaleString('en-IN')}` : ''}\n\nThank you for choosing Bhisez Furniture!`;
        const phoneForWa = customer.phone ? customer.phone.replace(/\D/g, '') : '';
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
              'a { text-decoration: none; color: inherit; }' +
              '.pdf-pay-btn { background-color: #1b9a59 !important; color: #ffffff !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; padding: 5px 12px !important; border-radius: 6px !important; font-weight: 900 !important; font-size: 9px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; text-decoration: none !important; text-align: center !important; margin-top: 4px !important; box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important; cursor: pointer !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
              '@media print { body { padding: 0; margin: 0; } .print\\:hidden { display: none !important; } .print\\:inline { display: inline !important; } .print\\:block { display: block !important; } .page-break-before-always, .break-before-page { page-break-before: always !important; break-before: page !important; } .pdf-pay-btn { display: inline-flex !important; background-color: #1b9a59 !important; color: #ffffff !important; } }' +
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[60] p-3 overflow-y-auto">
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

                <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowUPISettingsModal(true)}
                    className="bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Configure UPI QR code, payment VPA, or upload merchant standee"
                  >
                    <QrCode size={13} className="text-emerald-600" />
                    UPI QR Settings
                  </button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#20ba59] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Share2 size={13} />
                    Share via WhatsApp
                  </a>

                  {hasWriteAccess && activeQuote.status !== 'INVOICED' && activeQuote.status !== 'Invoiced' && activeQuote.status !== 'Approved' && (
                    <button
                      onClick={() => {
                        handleGenerateInvoiceForQuotation(activeQuote);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title="Generate official Invoice and set status to INVOICED"
                    >
                      <Receipt size={13} />
                      Generate Invoice
                    </button>
                  )}

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
                          <h3 className="font-bold text-slate-900 text-sm">{customer.name}</h3>
                          <p className="text-[11px] font-bold text-slate-700">
                            {docTitle} Ref: <span className="text-[#593622] font-extrabold">{quoteDisplayId}</span>
                          </p>
                          <div className="space-y-0.5 text-slate-600 text-[11px]">
                            {customer.phone && <p>Contact: <span className="font-semibold text-slate-800">{customer.phone}</span></p>}
                            {(customer.address || customer.city) && (
                              <p className="leading-snug">
                                Address: {customer.address ? `${customer.address}${customer.city && customer.city !== customer.address ? `, ${customer.city}` : ''}` : customer.city}
                              </p>
                            )}
                          </div>
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
                              {activeQuote.estimateNo !== undefined ? activeQuote.estimateNo : (activeQuote.id ? activeQuote.id.toString().replace(/\D/g, '').slice(-3) || '1' : '1')}
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={activeQuote.estimateNo !== undefined ? activeQuote.estimateNo : (activeQuote.id ? Number(activeQuote.id.toString().replace(/\D/g, '')) || 1 : 1)}
                              onChange={(e) => handleUpdateField('estimateNo', Number(e.target.value))}
                              className="print:hidden font-bold text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-amber-50/50 border border-transparent hover:border-dashed hover:border-slate-300 focus:border-amber-450 rounded px-1.5 py-0.5 text-[11px] w-20 outline-none transition"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-slate-600">Date:</span>
                            <span className="hidden print:inline font-bold text-slate-900">
                              {formatToDDMMYYYY(activeQuote.created_at)}
                            </span>
                            <input
                              type="date"
                              value={new Date(activeQuote.created_at).toISOString().split('T')[0]}
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
                                <tr key={item.id || `quote_item_${activeQuote.id}_${idx}`} className="divide-x divide-slate-400 text-[11px]">
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
                              <td className="p-2 text-right">₹{activeQuote.totalAmount.toLocaleString('en-IN')}.00</td>
                              <td className="p-2 text-right font-bold text-slate-900 pr-2">₹{activeQuote.totalAmount.toLocaleString('en-IN')}.00</td>
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
                          <span className="text-right font-extrabold text-slate-950 pr-1">: ₹{activeQuote.totalAmount.toLocaleString('en-IN')}.00</span>
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
                          {getAmountInWords(activeQuote.totalAmount)}
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
                            {activeQuote.description !== undefined ? activeQuote.description : (activeQuote.notes || '')}
                          </span>
                          <textarea
                            placeholder="Type custom description manually..."
                            value={activeQuote.description !== undefined ? activeQuote.description : (activeQuote.notes || '')}
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
                            {activeQuote.termsAndConditions !== undefined ? activeQuote.termsAndConditions : ''}
                          </span>
                          <textarea
                            placeholder="Type terms & conditions manually..."
                            value={activeQuote.termsAndConditions !== undefined ? activeQuote.termsAndConditions : ''}
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
                            <p>Account Holder: <span className="text-slate-900 font-bold">{UPI_CONFIG.accountHolder}</span></p>
                            <p>Account Number: <span className="text-slate-900 font-extrabold">{UPI_CONFIG.accountNumber}</span></p>
                            <p>IFSC: <span className="text-slate-900 font-extrabold">{UPI_CONFIG.ifscCode}</span></p>
                            <p>Branch: <span className="text-slate-900 font-bold">{UPI_CONFIG.branch}</span></p>
                            <p>Account Type: <span className="text-slate-900 font-bold">{UPI_CONFIG.accountType}</span></p>
                          </div>
                          <div 
                            className="col-span-5 flex flex-col items-center justify-center border-l border-slate-200 pl-2 group relative"
                            title={balanceAmt <= 0 ? 'Invoice Fully Paid' : `UPI Payment QR (Balance: ₹${balanceAmt.toFixed(2)})`}
                          >
                            {balanceAmt <= 0 ? (
                              <div className="flex flex-col items-center justify-center py-2.5 px-3 border-2 border-emerald-600 bg-emerald-50 rounded-xl text-center shadow-xs">
                                <span className="text-emerald-700 font-black text-sm tracking-widest uppercase">PAID</span>
                                <span className="text-[9px] text-emerald-800 font-bold mt-0.5">No Balance Due</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center relative">
                                <a 
                                  href={onlinePaymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setShowGooglePayModal(true);
                                  }}
                                  className="p-1 bg-white rounded border border-slate-200 shadow-2xs cursor-pointer hover:border-emerald-500 transition block"
                                  title="Click to view Google Pay QR & bank transfer details"
                                  style={{ textDecoration: 'none', display: 'block' }}
                                >
                                  <img 
                                    src={qrCodeUrl} 
                                    alt={`Google Pay QR Code for ${docTitle} ${quoteDisplayId}`} 
                                    className="w-24 h-24 sm:w-28 sm:h-28 print:w-22 print:h-22 object-contain block bg-white" 
                                  />
                                </a>
                                <a
                                  href={onlinePaymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
                                    if (isMobile) {
                                      launchGooglePay({
                                        amount: balanceAmt,
                                        invoiceRef: quoteDisplayId,
                                        upiId: currentEffectiveUPIId,
                                        payeeName: customPayeeName || undefined,
                                      });
                                    } else {
                                      setShowGooglePayModal(true);
                                    }
                                  }}
                                  style={{
                                    backgroundColor: '#1b9a59',
                                    color: '#ffffff',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    fontWeight: 900,
                                    fontSize: '9px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textDecoration: 'none',
                                    textAlign: 'center',
                                    marginTop: '4px',
                                    cursor: 'pointer',
                                    WebkitPrintColorAdjust: 'exact',
                                    printColorAdjust: 'exact',
                                  }}
                                  className="pdf-pay-btn hover:bg-[#158047] active:scale-[0.98] transition select-none shadow-xs"
                                  title={`Click to pay ₹${balanceAmt.toFixed(2)} with Google Pay`}
                                >
                                  <span>PAY WITH GOOGLE PAY</span>
                                </a>
                                <a 
                                  href={onlinePaymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setShowGooglePayModal(true);
                                  }}
                                  className="text-[8px] text-slate-500 font-mono mt-0.5 max-w-[135px] truncate text-center cursor-pointer hover:text-emerald-700 hover:underline print:no-underline select-all block"
                                  title={`UPI ID: ${currentEffectiveUPIId} (Click for Google Pay & Bank details)`}
                                  style={{ textDecoration: 'none' }}
                                >
                                  {copiedUPI ? '✓ Copied UPI ID!' : currentEffectiveUPIId}
                                </a>
                                
                                {/* Quick config icon in preview (hidden in print) */}
                                <button
                                  type="button"
                                  onClick={() => setShowUPISettingsModal(true)}
                                  className="print:hidden opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 p-1 bg-white hover:bg-stone-100 text-stone-600 rounded-full shadow border border-stone-200 transition cursor-pointer"
                                  title="Configure Google Pay UPI or custom QR"
                                >
                                  <Settings size={11} />
                                </button>
                              </div>
                            )}
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
                          description?: string;
                          itemIdx: number;
                          photoIdx?: number;
                        }> = [];

                        itemsList.forEach((item, idx) => {
                          const images = item.images || [];
                          if (images.length > 0) {
                            images.forEach((img, imgI) => {
                              const imgSrc = typeof img === 'string' ? img : (img?.url || '');
                              const description = typeof img === 'object' ? (img?.description || '') : '';
                              activeSlots.push({ item, imgSrc, description, itemIdx: idx, photoIdx: imgI });
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

                                    {/* Bottom Description (if provided) */}
                                    {slot.description && slot.description.trim() ? (
                                      <div className="pt-2 border-t border-slate-200">
                                        <div className="text-[10px] text-slate-700 bg-slate-50 border border-slate-200/80 rounded-md px-2.5 py-1.5 leading-snug break-words">
                                          <span className="font-bold text-slate-900">Description: </span>
                                          {slot.description}
                                        </div>
                                      </div>
                                    ) : null}
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
          className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImageModalUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-stone-900 border border-stone-700 rounded-2xl p-2 shadow-2xl flex flex-col items-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-2.5 border-b border-stone-800">
              <span className="text-xs font-bold font-mono text-stone-300 flex items-center gap-2">
                <ImageIcon size={14} className="text-amber-400" />
                Quotation Product Photo Inspection
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImageModalUrl}
                  {...(previewImageModalUrl.startsWith('data:')
                    ? { download: 'quotation-photo.jpg' }
                    : { target: '_blank', rel: 'noopener noreferrer' })}
                  className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                >
                  {previewImageModalUrl.startsWith('data:') ? 'Download Image' : 'Open High-Res'}
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
                referrerPolicy="no-referrer"
                alt="Quotation Full View"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* 8. UPI PAYMENT & QR CODE SETTINGS MODAL */}
      <UPISettingsModal
        isOpen={showUPISettingsModal}
        onClose={() => setShowUPISettingsModal(false)}
        customUPIId={customUPIId}
        setCustomUPIId={setCustomUPIId}
        customPayeeName={customPayeeName}
        setCustomPayeeName={setCustomPayeeName}
        customQR={customQR}
        setCustomQR={setCustomQR}
        sampleInvoiceRef={viewingEstimateQuote ? (viewingEstimateQuote.id.startsWith('QT-') ? viewingEstimateQuote.id : `QT-${viewingEstimateQuote.id}`) : 'QT-ESTIMATE'}
        sampleAmount={viewingEstimateQuote ? Math.max(0, viewingEstimateQuote.totalAmount - (viewingEstimateQuote.received_amount || 0)) : 5000}
      />

      {/* 9. GOOGLE PAY & DIRECT UPI PAYMENT MODAL */}
      <GooglePayModal
        isOpen={showGooglePayModal}
        onClose={() => setShowGooglePayModal(false)}
        amount={viewingEstimateQuote ? Math.max(0, viewingEstimateQuote.totalAmount - (viewingEstimateQuote.received_amount || 0)) : 0}
        invoiceRef={viewingEstimateQuote ? (viewingEstimateQuote.id.startsWith('QT-') ? viewingEstimateQuote.id : `QT-${viewingEstimateQuote.id}`) : 'QT-INVOICE'}
        qrCodeUrl={customQR || generatedQRDataUrl || upiQrImg || getUPIQRCodeUrl(buildUPIPaymentString({
          amount: viewingEstimateQuote ? Math.max(0, viewingEstimateQuote.totalAmount - (viewingEstimateQuote.received_amount || 0)) : 0,
          invoiceRef: viewingEstimateQuote ? (viewingEstimateQuote.id.startsWith('QT-') ? viewingEstimateQuote.id : `QT-${viewingEstimateQuote.id}`) : 'QT-INVOICE',
          upiId: customUPIId || undefined,
          payeeName: customPayeeName || undefined,
        }), 280)}
        effectiveUPIId={customUPIId && customUPIId.trim() ? customUPIId.trim() : UPI_CONFIG.upiId}
        effectivePayeeName={customPayeeName || UPI_CONFIG.payeeName}
      />

    </div>
  );
}
