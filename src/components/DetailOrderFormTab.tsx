import React from 'react';
import { Customer, Order, User, Payment, CRMAgreement } from '../types';
import { FileText, Printer, Sparkles, RefreshCw, AlertCircle, ArrowLeft, Trash2, Plus, Minus, UploadCloud, HardHat, Phone } from 'lucide-react';
import { formatToDDMMYYYY } from '../utils';

const CATEGORY_MAP: Record<string, string[]> = {
  'Door Frames': ['Set', 'Mandir Room', 'Door', 'Christian Door', 'Frame'],
  'Wooden Sofas': ['Sofa'],
  'Beds': ['Premium Bed', 'Open Bed', 'Floating Bed', 'Box Bed', 'Trolley Bed', 'Poster Bed', 'Bunk Bed', 'Hydraulic Bed'],
  'Dressing Table': ['Dressing Table'],
  'Wooden Swings': ['Swing'],
  'Wooden Safety Doors': ['Safety Door'],
  'Wooden Mandirs': ['Mandir', 'Rajasan', 'Pooja Mandir'],
  'Teapoys & Coffee Tables': ['Teapoy'],
  'Sofa Cum Beds': ['Sofa Cum Bed'],
  'Dining Tables': ['Dining'],
  'Wardrobes': ['Wardrobe'],
  'TV Units': ['TV Unit'],
  'Chaurang & Paats': ['Chaurang'],
  'Diwans': ['Open Diwan', 'Box Diwan', 'Trolley Diwan', 'Bhaiyya Khat'],
};

interface AgreementProduct {
  id: string;
  quotationId?: string;
  orderNo: string;
  articleNo: string;
  toArticleNo: string;
  category: string;
  subCategory: string;
  size: string;
  customSize: string;
  designType: 'Standard' | 'Custom';
  material: string;
  finish: string;
  colorShade: string;
  qty: number;
  quotedRate: number;
  cushion: number;
  hardware: number;
  discount: number;
  packingForwarding: number;
  transportation: number;
  advance: number;
  specialNotes: string;
  productName: string;
  itemDescription: string;
  amount: number;
  refImages: Array<{ id: string; url: string; type: 'Design Reference' }>;
}

interface DetailOrderFormTabProps {
  orders: Order[];
  customers: Customer[];
  users: User[];
  payments: Payment[];
  crmQuotations?: any[];
  crmCustomers?: any[];
  crmAgreements?: CRMAgreement[];
  preselectedQuotationId?: string | null;
  onClearPreselectedQuotation?: () => void;
  onSaveCRMAgreement?: (agreement: CRMAgreement) => void;
  onSendToWorkOrder?: (draft: any) => void;
}

export default function DetailOrderFormTab({
  orders,
  customers,
  users,
  payments,
  crmQuotations = [],
  crmCustomers = [],
  crmAgreements = [],
  preselectedQuotationId = null,
  onClearPreselectedQuotation,
  onSaveCRMAgreement,
  onSendToWorkOrder
}: DetailOrderFormTabProps) {
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>('');
  const [language, setLanguage] = React.useState<'en' | 'mr'>('en');

  // Common Client Metadata
  const [orderDate, setOrderDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [whatsappNo, setWhatsappNo] = React.useState('');
  const [address, setAddress] = React.useState('');

  // Common Technical Specs
  const [polishShade, setPolishShade] = React.useState('Walnut');
  const [paymentMode, setPaymentMode] = React.useState('GPay');
  const [typeOfPolish, setTypeOfPolish] = React.useState('PU Polish');

  // Selected Quote items
  const [selectedQuoteItemIds, setSelectedQuoteItemIds] = React.useState<string[]>([]);

  const createEmptyProduct = (customId?: string): AgreementProduct => ({
    id: customId || `prod_${Math.random().toString(36).substring(2, 9)}`,
    orderNo: '',
    articleNo: '',
    toArticleNo: '',
    category: 'Beds',
    subCategory: '',
    size: 'Custom',
    customSize: '',
    designType: 'Custom',
    material: 'Plywood',
    finish: 'hand polish',
    colorShade: 'Walnut',
    qty: 1,
    quotedRate: 0,
    cushion: 0,
    hardware: 0,
    discount: 0,
    packingForwarding: 0,
    transportation: 0,
    advance: 0,
    specialNotes: '',
    productName: '',
    itemDescription: '',
    amount: 0,
    refImages: []
  });

  // Dynamic products list
  const [products, setProducts] = React.useState<AgreementProduct[]>([]);

  // Make sure we have at least one product
  React.useEffect(() => {
    if (products.length === 0) {
      setProducts([createEmptyProduct()]);
    }
  }, [products]);

  // Generate unique order serial ref helper
  function generateNewOrderNo(targetDate?: string) {
    const dateToUse = targetDate || new Date().toISOString().split('T')[0];
    let yy = '';
    let mm = '';
    if (dateToUse && dateToUse.includes('-')) {
      const parts = dateToUse.split('-');
      if (parts[0] && parts[0].length === 4) yy = parts[0].slice(-2);
      if (parts[1]) mm = parts[1].padStart(2, '0');
    } else {
      const d = new Date();
      yy = d.getFullYear().toString().slice(-2);
      mm = String(d.getMonth() + 1).padStart(2, '0');
    }
    const prefix = `ORD${yy}${mm}`;
    let maxSerial = 0;
    if (orders && orders.length > 0) {
      orders.forEach((o) => {
        const checkIds = [o.id || '', o.article_no || ''];
        checkIds.forEach((id) => {
          if (id.startsWith(prefix)) {
            const serialPart = id.substring(prefix.length);
            const serialNum = parseInt(serialPart, 10);
            if (!isNaN(serialNum) && serialNum > maxSerial) {
              maxSerial = serialNum;
            }
          }
        });
      });
    }
    const nextSerial = maxSerial + 1;
    return `${prefix}${String(nextSerial).padStart(3, '0')}`;
  }

  // Preselected Quotation Auto-Fill trigger
  React.useEffect(() => {
    if (preselectedQuotationId && crmQuotations && crmQuotations.length > 0) {
      const quote = crmQuotations.find(q => q.id === preselectedQuotationId);
      if (quote) {
        setSelectedOrderId(`quote_${preselectedQuotationId}`);
        const crmCust = crmCustomers?.find((c) => c.id === quote.customer_id);
        
        setOrderDate(quote.created_at ? quote.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
        setDeliveryDate(quote.validUntil || '');
        setCustomerName(quote.customer_name || crmCust?.name || '');
        setWhatsappNo(crmCust?.phone || crmCust?.whatsappNumber || '');
        setAddress(crmCust?.address || '');
        
        const quoteItems = quote.items || [];
        const initialProducts: AgreementProduct[] = quoteItems.map((item: any, idx: number) => {
          let matchedCat = 'Beds';
          for (const [cat, subs] of Object.entries(CATEGORY_MAP)) {
            if (subs.some((s) => item.furnitureItem.toLowerCase().includes(s.toLowerCase()))) {
              matchedCat = cat;
              break;
            }
          }
          
          return {
            id: `${quote.id}_${item.id || idx}`,
            quotationId: quote.id,
            orderNo: quote.id,
            articleNo: `QT/${quote.id.replace('QT-', '')}/${idx + 1}`,
            toArticleNo: '',
            category: matchedCat,
            subCategory: item.furnitureItem,
            size: 'Custom',
            customSize: item.dimensions || 'Standard',
            designType: 'Custom',
            material: item.material || 'Plywood',
            finish: 'hand polish',
            colorShade: 'Walnut',
            qty: item.quantity || 1,
            quotedRate: item.unitPrice || 0,
            cushion: 0,
            hardware: 0,
            discount: item.discount || 0,
            packingForwarding: 0,
            transportation: 0,
            advance: 0,
            specialNotes: quote.notes || '',
            productName: item.furnitureItem,
            itemDescription: item.dimensions || '',
            amount: (item.unitPrice || 0) * (item.quantity || 1),
            refImages: []
          };
        });
        
        const initialSelectedIds = quoteItems.map((item: any, idx: number) => `${quote.id}_${item.id || idx}`);
        setSelectedQuoteItemIds(initialSelectedIds);
        setProducts(initialProducts.length > 0 ? initialProducts : [createEmptyProduct()]);
      }
      if (onClearPreselectedQuotation) {
        onClearPreselectedQuotation();
      }
    }
  }, [preselectedQuotationId, crmQuotations, crmCustomers, onClearPreselectedQuotation]);

  // Aggregate All Selectable Quote items for Multi-Selection
  const getAllSelectableQuoteItems = () => {
    const list: Array<{
      id: string;
      quoteId: string;
      customerId: string;
      customerName: string;
      phone: string;
      address: string;
      furnitureItem: string;
      dimensions: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
      notes: string;
      discount: number;
      material?: string;
      created_at?: string;
      validUntil?: string;
    }> = [];

    crmQuotations.forEach((q) => {
      if (q.status === 'Approved' || q.status === 'Draft' || q.status === 'Sent') {
        const crmCust = crmCustomers.find(c => c.id === q.customer_id);
        const items = q.items || [];
        items.forEach((item: any, idx: number) => {
          list.push({
            id: `${q.id}_${item.id || idx}`,
            quoteId: q.id,
            customerId: q.customer_id,
            customerName: q.customer_name || crmCust?.name || 'Customer',
            phone: crmCust?.phone || crmCust?.whatsappNumber || '',
            address: crmCust?.address || '',
            furnitureItem: item.furnitureItem,
            dimensions: item.dimensions || '',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            totalAmount: (item.unitPrice || 0) * (item.quantity || 1) - (item.discount || 0),
            notes: q.notes || '',
            discount: item.discount || 0,
            material: item.material,
            created_at: q.created_at,
            validUntil: q.validUntil
          });
        });
      }
    });

    return list;
  };

  // Group items by customer for checklist rendering
  const selectableItemsByCustomer: Record<string, { customerName: string; items: any[] }> = {};
  getAllSelectableQuoteItems().forEach((item) => {
    if (!selectableItemsByCustomer[item.customerId]) {
      selectableItemsByCustomer[item.customerId] = {
        customerName: item.customerName,
        items: []
      };
    }
    selectableItemsByCustomer[item.customerId].items.push(item);
  });

  // Toggle quotation items multi-select
  const handleToggleQuoteItem = (item: any) => {
    const isSelected = selectedQuoteItemIds.includes(item.id);
    if (!isSelected) {
      // customer validation
      const currentlySelectedItems = getAllSelectableQuoteItems().filter(x => selectedQuoteItemIds.includes(x.id));
      if (currentlySelectedItems.length > 0 && currentlySelectedItems[0].customerId !== item.customerId) {
        alert(`Only approved quotations belonging to the same customer (${currentlySelectedItems[0].customerName}) can be combined.`);
        return;
      }

      const nextSelectedIds = [...selectedQuoteItemIds, item.id];
      setSelectedQuoteItemIds(nextSelectedIds);

      // Auto populate customer details if first selection
      if (selectedQuoteItemIds.length === 0) {
        setCustomerName(item.customerName);
        setWhatsappNo(item.phone);
        setAddress(item.address);
        if (item.created_at) setOrderDate(item.created_at.split('T')[0]);
        if (item.validUntil) setDeliveryDate(item.validUntil);
      }

      // Add to products array
      let matchedCat = 'Beds';
      for (const [cat, subs] of Object.entries(CATEGORY_MAP)) {
        if (subs.some((s) => item.furnitureItem.toLowerCase().includes(s.toLowerCase()))) {
          matchedCat = cat;
          break;
        }
      }

      const newProd: AgreementProduct = {
        id: item.id,
        quotationId: item.quoteId,
        orderNo: item.quoteId,
        articleNo: `QT/${item.quoteId.replace('QT-', '')}/${nextSelectedIds.length}`,
        toArticleNo: '',
        category: matchedCat,
        subCategory: item.furnitureItem,
        size: 'Custom',
        customSize: item.dimensions || 'Standard',
        designType: 'Custom',
        material: item.material || 'Plywood',
        finish: 'hand polish',
        colorShade: 'Walnut',
        qty: item.quantity || 1,
        quotedRate: item.unitPrice || 0,
        cushion: 0,
        hardware: 0,
        discount: item.discount || 0,
        packingForwarding: 0,
        transportation: 0,
        advance: 0,
        specialNotes: item.notes || '',
        productName: item.furnitureItem,
        itemDescription: item.dimensions || '',
        amount: (item.unitPrice || 0) * (item.quantity || 1),
        refImages: []
      };

      setProducts((prev) => {
        const cleaned = prev.filter(p => !p.quotationId && p.productName === '' && p.amount === 0);
        return [...cleaned, newProd];
      });
    } else {
      const nextSelectedIds = selectedQuoteItemIds.filter(id => id !== item.id);
      setSelectedQuoteItemIds(nextSelectedIds);

      setProducts((prev) => {
        const remaining = prev.filter(p => p.id !== item.id);
        return remaining;
      });
    }
  };

  // Load standard active order details (single-product fallback)
  const handleLoadActiveOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    setSelectedOrderId(`order_${orderId}`);
    setSelectedQuoteItemIds([]);

    const cust = customers.find((c) => c.id === order.customer_id);
    const orderPayment = payments ? payments.find((p) => p.order_id === order.id) : null;
    const orderAdvance = orderPayment ? orderPayment.advance_paid : 0;

    setOrderDate(order.order_date || new Date().toISOString().split('T')[0]);
    setDeliveryDate(order.delivery_date || '');
    setCustomerName(cust ? cust.name : '');
    setWhatsappNo(cust ? cust.phone : '');
    setAddress(cust && cust.address ? cust.address : '');

    const activeProd: AgreementProduct = {
      id: `order_${order.id}`,
      orderNo: order.id,
      articleNo: order.article_no || '',
      toArticleNo: '',
      category: order.category || 'Beds',
      subCategory: order.sub_category || 'Custom',
      size: order.size || 'Custom',
      customSize: order.custom_size || '',
      designType: 'Custom',
      material: order.material || 'Plywood',
      finish: order.finish_type || order.finish || 'hand polish',
      colorShade: order.color_shade || 'Walnut',
      qty: order.no_of_units || 1,
      quotedRate: 15000,
      cushion: 0,
      hardware: 0,
      discount: 0,
      packingForwarding: 1200,
      transportation: 1800,
      advance: orderAdvance,
      specialNotes: order.special_notes || '',
      productName: order.sub_category || 'Handcrafted Furniture',
      itemDescription: order.custom_size || '',
      amount: 15000 * (order.no_of_units || 1),
      refImages: order.images ? order.images.map(img => ({ id: img.id, url: img.url, type: 'Design Reference' })) : []
    };

    setProducts([activeProd]);
  };

  // State update helpers
  const updateProduct = (index: number, fields: Partial<AgreementProduct>) => {
    setProducts((prev) => prev.map((p, idx) => (idx === index ? { ...p, ...fields } : p)));
  };

  const handleAddProduct = () => {
    setProducts((prev) => [...prev, createEmptyProduct()]);
  };

  const handleRemoveProductAt = (index: number) => {
    setProducts((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered;
    });
  };

  // Image Upload Compression
  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_size = 600;
        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleProductFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawUrl = event.target?.result as string;
        const compressedUrl = await compressImage(rawUrl);
        setProducts((prev) => prev.map((p, idx) => {
          if (idx === index) {
            return {
              ...p,
              refImages: [
                ...p.refImages,
                {
                  id: `img_${Math.random().toString(36).substring(2, 9)}`,
                  url: compressedUrl,
                  type: 'Design Reference',
                }
              ]
            };
          }
          return p;
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Calculations across combined products
  const totalInvoiced = products.reduce((sum, p) => {
    const subtotal = (p.quotedRate * p.qty) + p.cushion + p.hardware + p.packingForwarding + p.transportation - p.discount;
    return sum + subtotal;
  }, 0);

  const totalAdvancePaid = products.reduce((sum, p) => sum + p.advance, 0);
  const outstandingBalance = totalInvoiced - totalAdvancePaid;

  // Clear Form handler
  const clearForm = () => {
    setCustomerName('');
    setWhatsappNo('');
    setAddress('');
    setProducts([createEmptyProduct()]);
    setSelectedQuoteItemIds([]);
    setSelectedOrderId('');
  };

  // Save Agreement and Delegate to Workshop
  const handleSendToWorkOrder = () => {
    if (!customerName.trim()) {
      alert('Please fill in the Customer Name.');
      return;
    }
    if (!whatsappNo.trim()) {
      alert('Please fill in WhatsApp Number.');
      return;
    }

    const agreementId = `AGR-${new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2)}-${Math.floor(100 + Math.random() * 900)}`;
    const agreement: CRMAgreement = {
      id: agreementId,
      customer_name: customerName,
      whatsapp_no: whatsappNo,
      address: address,
      order_date: orderDate,
      delivery_date: deliveryDate,
      polish_shade: polishShade,
      payment_mode: paymentMode,
      type_of_polish: typeOfPolish,
      products: products.map(p => ({
        id: p.id,
        quotation_id: p.quotationId,
        order_no: p.orderNo,
        article_no: p.articleNo,
        to_article_no: p.toArticleNo,
        category: p.category,
        sub_category: p.subCategory,
        size: p.size,
        custom_size: p.customSize,
        design_type: p.designType,
        material: p.material,
        finish_type: p.finish,
        color_shade: p.colorShade,
        quantity: p.qty,
        quoted_rate: p.quotedRate,
        cushion_cost: p.cushion,
        hardware_additions: p.hardware,
        discount_given: p.discount,
        packing_forwarding: p.packingForwarding,
        transportation_charges: p.transportation,
        advance_received: p.advance,
        special_notes: p.specialNotes,
        product_name: p.productName,
        item_description: p.itemDescription,
        ref_images: p.refImages
      })),
      total_invoiced: totalInvoiced,
      total_advance_paid: totalAdvancePaid,
      outstanding_balance: outstandingBalance,
      created_at: new Date().toISOString(),
      created_by: 'Admin'
    };

    if (onSaveCRMAgreement) {
      onSaveCRMAgreement(agreement);
    }

    // Send the primary first product config to order creation draft
    const firstProduct = products[0];
    if (firstProduct) {
      const draft = {
        category: firstProduct.category,
        subCategory: firstProduct.subCategory,
        size: firstProduct.size,
        customSize: firstProduct.customSize,
        designType: firstProduct.designType,
        material: firstProduct.material,
        finish: firstProduct.finish,
        colorShade: firstProduct.colorShade,
        qty: firstProduct.qty,
        specialNotes: firstProduct.specialNotes,
        customerName,
        whatsappNo,
        address,
        refImages: firstProduct.refImages,
        quotedRate: firstProduct.quotedRate,
        cushion: firstProduct.cushion,
        discount: firstProduct.discount,
        hardware: firstProduct.hardware,
        packingForwarding: firstProduct.packingForwarding,
        transportation: firstProduct.transportation,
        advance: firstProduct.advance,
        orderDate,
        deliveryDate,
        productName: firstProduct.productName,
        itemDescription: firstProduct.itemDescription,
        amount: firstProduct.amount,
        finalRate: firstProduct.quotedRate + firstProduct.cushion + firstProduct.hardware - firstProduct.discount,
        balance: (firstProduct.quotedRate + firstProduct.cushion + firstProduct.hardware - firstProduct.discount) * firstProduct.qty + firstProduct.packingForwarding + firstProduct.transportation - firstProduct.advance,
        polishShade,
        paymentMode,
        typeOfPolish,
        orderNo: firstProduct.orderNo,
        articleNo: firstProduct.articleNo,
        toArticleNo: firstProduct.toArticleNo,
        combinedProducts: products
      };

      if (onSendToWorkOrder) {
        onSendToWorkOrder(draft);
      }
    }
  };

  // Browser system print trigger
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp send trigger
  const getWhatsAppUrl = () => {
    let rawPhone = whatsappNo.trim();
    if (!rawPhone) return '#';
    rawPhone = rawPhone.replace(/\D/g, '');
    if (rawPhone.length === 10) rawPhone = '91' + rawPhone;
    
    const summaryLines = products.map((p, idx) => {
      const subtotal = (p.quotedRate * p.qty) + p.cushion + p.hardware + p.packingForwarding + p.transportation - p.discount;
      return `• Product #${idx + 1}: ${p.productName || 'Handcrafted Furniture'} (Qty: ${p.qty}) - ₹${subtotal.toLocaleString()}`;
    }).join('\n');

    const msgText = `Hello ${customerName || 'Customer'},\n\nYour Combined Purchase Agreement has been finalized!\n\n*SUMMARY OF ORDER PRODUCTS*:\n${summaryLines}\n\n*FINANCIAL SUMMARY*:\n- Consolidated Invoice Total: ₹${totalInvoiced.toLocaleString()}\n- Total Advance Deposited: ₹${totalAdvancePaid.toLocaleString()}\n- Outstanding Balance: ₹${outstandingBalance.toLocaleString()}\n\nThank you for choosing Shri Samarth Woodworks!\nWe will update you on manufacturing progress.`;
    return `https://wa.me/${rawPhone}?text=${encodeURIComponent(msgText)}`;
  };

  return (
    <div className="space-y-6">
      {/* Tab Branding Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200/60 pb-5">
        <div>
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Bespoke Contract Suite</span>
          <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight mt-1">
            Detail Order &amp; Combined Agreement Form
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            Combine multiple approved product requirements into a single customer contract with individual spec panels and shared calculations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearForm}
            className="px-3.5 py-1.5 border border-stone-300 rounded-xl text-stone-600 hover:bg-stone-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={13} /> Reset Form
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-stone-900 text-amber-300 rounded-xl hover:bg-black text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Printer size={13} /> Quick Print (A4)
          </button>
        </div>
      </div>

      {/* Dynamic Multi-Select Dropdown Bento Panel */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-600" size={16} />
            <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider font-display">
              Grouped Quotations Checklist &amp; Quick Load
            </h3>
          </div>
          <span className="text-[10px] bg-amber-50 text-[#593622] border border-[#593622]/20 px-2.5 py-0.5 rounded-full font-bold font-mono">
            Same-Customer Multi-Select Filter Enabled
          </span>
        </div>
        
        <p className="text-stone-500 text-[11px] leading-relaxed">
          Select multiple approved quotations below belonging to the same customer to build a combined contract. To ensure agreement integrity, selections across different customers are locked automatically.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Approved Quotations Group List */}
          <div className="border border-stone-200/80 rounded-xl p-3 bg-stone-50/50 max-h-56 overflow-y-auto space-y-3.5">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block border-b border-stone-200 pb-1 font-mono">
              Approved Lead Quotations
            </span>
            {Object.keys(selectableItemsByCustomer).length === 0 ? (
              <span className="text-xs text-stone-400 block py-6 text-center italic">No approved quotations found in CRM pipeline.</span>
            ) : (
              Object.entries(selectableItemsByCustomer).map(([custId, group]) => {
                const isAnotherCustomerSelected = selectedQuoteItemIds.length > 0 && 
                  getAllSelectableQuoteItems().find(x => selectedQuoteItemIds.includes(x.id))?.customerId !== custId;
                  
                return (
                  <div key={custId} className={`space-y-1.5 ${isAnotherCustomerSelected ? 'opacity-40' : ''}`}>
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                      👤 {group.customerName}
                      {isAnotherCustomerSelected && <span className="text-[9px] font-semibold text-rose-600 font-sans ml-1">(Locked)</span>}
                    </span>
                    <div className="space-y-1 pl-1">
                      {group.items.map((item) => {
                        const isChecked = selectedQuoteItemIds.includes(item.id);
                        return (
                          <label 
                            key={item.id} 
                            className={`flex items-start gap-2 p-2 rounded-lg border text-xs transition cursor-pointer select-none ${
                              isChecked 
                                ? 'bg-amber-50/40 border-[#593622]/30 text-[#593622] font-bold' 
                                : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isAnotherCustomerSelected}
                              onChange={() => handleToggleQuoteItem(item)}
                              className="mt-0.5 rounded text-[#593622] focus:ring-[#593622] h-3.5 w-3.5 cursor-pointer accent-[#593622]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between font-mono text-[9px] text-stone-400">
                                <span className="font-bold">{item.quoteId}</span>
                                <span className="text-amber-800 font-black">₹{item.totalAmount.toLocaleString()}</span>
                              </div>
                              <p className="truncate mt-0.5 text-[11px] font-semibold text-stone-800">{item.furnitureItem} (Qty: {item.quantity})</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Active Workshop Orders (Single Select) */}
          <div className="border border-stone-200/80 rounded-xl p-3 bg-stone-50/50 max-h-56 overflow-y-auto space-y-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block border-b border-stone-200 pb-1 font-mono">
              Active Workshop Orders (Load Spec)
            </span>
            {orders.length === 0 ? (
              <span className="text-xs text-stone-400 block py-6 text-center italic">No active production orders found.</span>
            ) : (
              <div className="space-y-1">
                {orders.map((ord) => {
                  const cust = customers.find((c) => c.id === ord.customer_id);
                  const isLoaded = selectedOrderId === `order_${ord.id}`;
                  return (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => handleLoadActiveOrder(ord.id)}
                      className={`w-full text-left p-2 rounded-lg border text-xs flex justify-between items-center transition ${
                        isLoaded
                          ? 'bg-amber-50/40 border-[#593622]/30 text-[#593622] font-bold'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 font-mono text-[9px] text-stone-400">
                          <span className="font-bold text-stone-700">{ord.article_no || ord.id}</span>
                          <span>•</span>
                          <span className="truncate">{cust?.name || 'Walk-in'}</span>
                        </div>
                        <p className="truncate mt-0.5 text-stone-700 font-semibold">{ord.category} › {ord.sub_category}</p>
                      </div>
                      {isLoaded && <span className="text-[9px] bg-[#593622] text-white px-1.5 py-0.5 rounded-md font-black shrink-0 font-mono">Loaded</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Column Grid (Form Left, Live A4 Preview Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Panel */}
        <div className="lg:col-span-6 space-y-5">
          {/* I. Client & Metadata block */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="border-b pb-2">
              <span className="bg-[#593622]/10 text-[#593622] px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">Section I</span>
              <h2 className="text-xs font-black text-[#593622] uppercase tracking-wider font-display mt-1">Client Metadata &amp; Delivery</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Contract Order Date *</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Target Delivery Date *</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Bhavesh K."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">WhatsApp / Contact No *</label>
                <input
                  type="text"
                  placeholder="10 digit mobile"
                  value={whatsappNo}
                  onChange={(e) => setWhatsappNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Shipping &amp; Installation Address *</label>
              <textarea
                rows={2}
                placeholder="Complete site delivery location..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
              />
            </div>
          </div>

          {/* II. Shared Polish & Payment Specifications */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="border-b pb-2">
              <span className="bg-[#593622]/10 text-[#593622] px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">Section II</span>
              <h2 className="text-xs font-black text-[#593622] uppercase tracking-wider font-display mt-1">Shared Finish &amp; Payment Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Polish Shade Selection</label>
                <input
                  type="text"
                  value={polishShade}
                  onChange={(e) => setPolishShade(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Payment Channel / Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                >
                  <option value="GPay">Google Pay (GPay)</option>
                  <option value="PhonePe">PhonePe / UPI</option>
                  <option value="Bank Transfer">NEFT / RTGS / IMPS</option>
                  <option value="Cash">Liquid Cash</option>
                  <option value="Cheque">Local Cheque Deposit</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Polish Standard Type</label>
                <select
                  value={typeOfPolish}
                  onChange={(e) => setTypeOfPolish(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                >
                  <option value="PU Polish">PU Polish (Glossy/Matte)</option>
                  <option value="Melamine Polish">Melamine Polish Coating</option>
                  <option value="Natural Hand Polish">Natural Wax/French Hand Polish</option>
                  <option value="Laminate Overlay">Laminate/Mica Paste</option>
                </select>
              </div>
            </div>
          </div>

          {/* III. Combined Products Specs Panels List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xs font-black text-stone-900 uppercase tracking-wider font-display">
                Section III: Agreement Product List ({products.length})
              </h2>
              <button
                type="button"
                onClick={handleAddProduct}
                className="bg-stone-100 hover:bg-[#593622] text-[#593622] hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Manual Product
              </button>
            </div>

            {products.map((prod, index) => (
              <div key={prod.id || index} className="bg-white border border-stone-200/85 rounded-2xl p-5 space-y-4 shadow-xs relative">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#593622] text-white rounded-full h-5 w-5 flex items-center justify-center font-mono text-[10px] font-black">
                      {index + 1}
                    </span>
                    <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider font-display">
                      {prod.productName || 'Handcrafted Furniture item'}
                    </h3>
                  </div>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProductAt(index)}
                      className="text-stone-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                      title="Remove Product"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Item Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Bed, Premium Dining Table"
                      value={prod.productName}
                      onChange={(e) => updateProduct(index, { productName: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Quotation ID / Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. QT-XX-XX-XXX"
                      value={prod.orderNo}
                      onChange={(e) => updateProduct(index, { orderNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Contract Article No *</label>
                    <input
                      type="text"
                      placeholder="e.g. ORD2607001-A"
                      value={prod.articleNo}
                      onChange={(e) => updateProduct(index, { articleNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">To Article No (Ref)</label>
                    <input
                      type="text"
                      placeholder="e.g. Pair unit Ref"
                      value={prod.toArticleNo}
                      onChange={(e) => updateProduct(index, { toArticleNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Item Category</label>
                    <select
                      value={prod.category}
                      onChange={(e) => updateProduct(index, { category: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                    >
                      {Object.keys(CATEGORY_MAP).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Sub-Category</label>
                    <input
                      type="text"
                      value={prod.subCategory}
                      onChange={(e) => updateProduct(index, { subCategory: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Size Selection</label>
                    <select
                      value={prod.size}
                      onChange={(e) => updateProduct(index, { size: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                    >
                      <option value="6ft">6ft (Premium Standard)</option>
                      <option value="4ft">4ft (Single size)</option>
                      <option value="3ft">3ft (Compact size)</option>
                      <option value="Custom">Custom Dimensions Specification</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Material Structure</label>
                    <input
                      type="text"
                      value={prod.material}
                      onChange={(e) => updateProduct(index, { material: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                    />
                  </div>
                </div>

                {prod.size === 'Custom' && (
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Custom Size Details *</label>
                    <input
                      type="text"
                      placeholder="e.g. 78x60x18 inches"
                      value={prod.customSize}
                      onChange={(e) => updateProduct(index, { customSize: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Brief Item Description</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Hand carved premium teakwood borders..."
                      value={prod.itemDescription}
                      onChange={(e) => updateProduct(index, { itemDescription: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Special Manufacturing Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Specific requests, alignment details..."
                      value={prod.specialNotes}
                      onChange={(e) => updateProduct(index, { specialNotes: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#593622] rounded-lg text-xs focus:outline-none text-stone-750 font-semibold"
                    />
                  </div>
                </div>

                {/* Product specific design images */}
                <div className="border border-stone-200/80 rounded-xl p-3 bg-stone-50/50 space-y-2">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block font-mono">Reference Images / Sketches ({prod.refImages.length})</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {prod.refImages.map((img) => (
                      <div key={img.id} className="relative h-14 w-14 border border-stone-200 rounded-lg overflow-hidden group shadow-xs shrink-0 bg-white">
                        <img src={img.url} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => {
                            const remaining = prod.refImages.filter(i => i.id !== img.id);
                            updateProduct(index, { refImages: remaining });
                          }}
                          className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white p-0.5 rounded-full shadow-xs transition"
                        >
                          <Trash2 size={9} />
                        </button>
                      </div>
                    ))}
                    <label className="h-14 w-14 border-dashed border-2 border-stone-300 hover:border-[#593622] rounded-lg flex flex-col items-center justify-center text-stone-400 hover:text-[#593622] cursor-pointer bg-white transition shrink-0">
                      <UploadCloud size={16} />
                      <span className="text-[8px] font-black uppercase mt-1">Upload</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleProductFileUpload(index, e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Pricing Fields panel */}
                <div className="bg-amber-50/20 border border-amber-200/40 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] font-bold text-[#593622] uppercase tracking-wider block font-display">Pricing &amp; Itemized Calculations</span>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        value={prod.qty}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                          updateProduct(index, { qty: val, amount: prod.quotedRate * val });
                        }}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Quoted Rate (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        value={prod.quotedRate}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          updateProduct(index, { quotedRate: val, amount: val * prod.qty });
                        }}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Cushion Cost (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={prod.cushion}
                        onChange={(e) => updateProduct(index, { cushion: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={prod.discount}
                        onChange={(e) => updateProduct(index, { discount: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Hardware Add (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={prod.hardware}
                        onChange={(e) => updateProduct(index, { hardware: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Packing/Fwd (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={prod.packingForwarding}
                        onChange={(e) => updateProduct(index, { packingForwarding: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Transportation (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={prod.transportation}
                        onChange={(e) => updateProduct(index, { transportation: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Advance Received (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={prod.advance}
                        onChange={(e) => updateProduct(index, { advance: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-dashed border-amber-200/60 flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs gap-1">
                    <div className="font-mono text-stone-500">
                      Product Subtotal: <strong className="text-stone-800">₹{((prod.quotedRate * prod.qty) + prod.cushion + prod.hardware + prod.packingForwarding + prod.transportation - prod.discount).toLocaleString()}</strong>
                    </div>
                    <div className="font-mono text-[#593622] font-extrabold sm:text-right">
                      Agreed Net Rate: ₹{(prod.quotedRate + prod.cushion + prod.hardware - prod.discount).toLocaleString()} / unit
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* VI. Workshop delegation action panel */}
          <div className="bg-amber-50/10 border-2 border-amber-500/25 rounded-2xl p-5 space-y-4 shadow-sm">
            <div>
              <span className="bg-[#593622]/10 text-[#593622] px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase block w-max mb-1.5">Launch Manufacturing Line</span>
              <h2 className="text-sm font-black text-[#593622] uppercase tracking-wider font-display">VI. Workshop Delegation</h2>
            </div>
            
            <p className="text-stone-500 text-xs leading-relaxed">
              Confirm agreement terms? Clicking the button below generates one common database agreement, validates all specifications, and navigates to the <strong>Work Order Assignment tab</strong>, skipping manual inputs!
            </p>

            <button
              type="button"
              onClick={handleSendToWorkOrder}
              className="w-full py-3 bg-[#593622] hover:bg-[#452717] text-amber-300 font-extrabold text-xs uppercase tracking-widest rounded-xl inline-flex items-center justify-center gap-2 shadow-md transition duration-150 cursor-pointer"
            >
              <HardHat size={16} />
              Send to Work Order Flow
            </button>
          </div>
        </div>

        {/* Right Column: Live A4 Preview */}
        <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider font-display flex items-center gap-1.5">
              <FileText size={14} className="text-[#593622]" /> Live Preview (A4 Proportion)
            </h3>
            
            <div className="flex bg-stone-100 p-1 rounded-lg gap-1 border border-stone-200">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-[10px] font-black rounded transition cursor-pointer ${language === 'en' ? 'bg-[#593622] text-white shadow-xs' : 'text-stone-500 hover:text-stone-900'}`}
              >
                ENGLISH
              </button>
              <button
                onClick={() => setLanguage('mr')}
                className={`px-2 py-1 text-[10px] font-black rounded transition cursor-pointer ${language === 'mr' ? 'bg-[#593622] text-white shadow-xs' : 'text-stone-500 hover:text-stone-900'}`}
              >
                मराठी
              </button>
            </div>
          </div>

          <div className="bg-white border border-stone-300 shadow-xl rounded-2xl overflow-hidden p-6 aspect-[1/1.41] flex flex-col justify-between font-serif relative max-w-lg mx-auto text-stone-850 text-xs leading-relaxed">
            {/* Header branding info */}
            <div>
              <div className="flex justify-between items-start border-b-2 border-[#593622] pb-3">
                <div>
                  <h1 className="text-sm font-black text-[#593622] tracking-wider uppercase font-sans">
                    SHRI SAMARTH WOODWORKS
                  </h1>
                  <p className="text-[9px] font-sans text-stone-500 uppercase font-semibold">
                    Premium Teakwood &amp; Bespoke Furniture Manufacturers
                  </p>
                </div>
                <div className="text-right text-[10px] font-mono">
                  <p className="font-bold text-stone-950">AGREEMENT</p>
                  <p className="text-stone-500">Date: {formatToDDMMYYYY(orderDate)}</p>
                </div>
              </div>

              {/* Client specifications panel */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-stone-100 font-sans text-[11px]">
                <div>
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Customer Details:</span>
                  <p className="font-extrabold text-stone-950 mt-0.5">{customerName || '_______________________'}</p>
                  <p className="text-stone-600 mt-1 flex items-center gap-1 font-semibold">
                    <Phone size={10} /> {whatsappNo || '___________________'}
                  </p>
                  <p className="text-stone-500 mt-1 italic text-[10px] whitespace-pre-wrap">{address || 'No address added yet.'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Delivery Schedule &amp; Specs:</span>
                  <p className="font-extrabold text-amber-900 mt-0.5">Delivery: {deliveryDate ? formatToDDMMYYYY(deliveryDate) : '_______________________'}</p>
                  <p className="text-stone-600 mt-1 text-[10px] font-semibold">Polish Shade: <span className="text-stone-950">{polishShade}</span></p>
                  <p className="text-stone-600 mt-0.5 text-[10px] font-semibold">Polish Standard: <span className="text-stone-950">{typeOfPolish}</span></p>
                </div>
              </div>

              {/* Itemized product list table */}
              <div className="py-4">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block mb-2 font-sans">Combined Order Items ({products.length}):</span>
                <table className="w-full text-[11px] font-mono text-left">
                  <thead>
                    <tr className="border-b border-stone-300 text-[10px] text-stone-400">
                      <th className="py-1">PRODUCT SPECIFICATIONS</th>
                      <th className="py-1 text-center">QTY</th>
                      <th className="py-1 text-right">RATE</th>
                      <th className="py-1 text-right">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, idx) => {
                      const pSub = (p.quotedRate * p.qty) + p.cushion + p.hardware + p.packingForwarding + p.transportation - p.discount;
                      return (
                        <tr key={p.id || idx} className="border-b border-stone-100">
                          <td className="py-1.5 font-sans">
                            <span className="font-black text-stone-950 block text-[11.5px]">#{idx + 1}: {p.productName || 'Handcrafted Furniture'}</span>
                            <span className="text-[9.5px] text-stone-500 uppercase font-semibold block mt-0.5 font-mono">
                              {p.category} • {p.subCategory || 'Bespoke'} • Size: {p.size === 'Custom' ? p.customSize : p.size} • Polish: {p.finish}
                            </span>
                          </td>
                          <td className="py-1.5 text-center font-bold">{p.qty}</td>
                          <td className="py-1.5 text-right">₹{p.quotedRate.toLocaleString()}</td>
                          <td className="py-1.5 text-right font-bold text-stone-950">₹{pSub.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations & signatures block */}
            <div className="border-t border-stone-200 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 font-sans text-[10px] text-stone-500">
                  <p className="font-semibold text-[9px] uppercase text-stone-400 tracking-wider">Payment Structure:</p>
                  <p>Channel / Mode: <span className="font-extrabold text-stone-900">{paymentMode}</span></p>
                  <p className="text-[9px] leading-relaxed italic mt-1 text-stone-400">Please clear all pending outstanding balances at delivery validation step.</p>
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Invoice Value:</span>
                    <span>₹{totalInvoiced.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold border-b border-stone-100 pb-1">
                    <span>Total Advance:</span>
                    <span>- ₹{totalAdvancePaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-[#593622] text-[13px] uppercase pt-1">
                    <span>Balance Due:</span>
                    <span>₹{outstandingBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Legal Signatures */}
              <div className="flex justify-between items-end pt-8 font-sans text-[9px] font-bold text-stone-400">
                <div className="text-center w-28 border-t border-stone-300 pt-1 uppercase">
                  Customer Seal/Sign
                </div>
                <div className="text-center text-[#593622] font-mono text-[10px] font-black italic">
                  Shri Samarth Woodworks
                </div>
                <div className="text-center w-28 border-t border-stone-300 pt-1 uppercase">
                  Authorized Admin Sign
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions box */}
          {whatsappNo && (
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl inline-flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Phone size={14} /> Send Agreement Summary to WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* HTML PRINT TEMPLATE (Pure Printable layout, visible only during print stylesheet trigger) */}
      <div id="print-area" className="hidden print:block p-10 font-serif text-xs text-black bg-white space-y-10 leading-relaxed">
        {/* Printable Page 1 */}
        <div className="h-[297mm] flex flex-col justify-between p-8 bg-white border border-transparent">
          <div>
            {/* Header branding */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div>
                <h1 className="text-xl font-extrabold uppercase font-sans tracking-wide">
                  SHRI SAMARTH WOODWORKS
                </h1>
                <p className="text-[10px] text-stone-600 font-semibold font-sans">
                  Premium Custom Teakwood Manufacturers &amp; Carpentry
                </p>
                <p className="text-[9px] text-stone-500 font-sans mt-0.5">
                  Workshop Address: Gat No 182, Woodworks Line, Maharashtra, India
                </p>
              </div>
              <div className="text-right font-mono text-[10px]">
                <h2 className="text-sm font-bold tracking-widest uppercase">Purchase Contract</h2>
                <p className="mt-1">Order Ref: AGR-{new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2)}</p>
                <p className="mt-0.5">Date: {formatToDDMMYYYY(orderDate)}</p>
              </div>
            </div>

            {/* Metadata information */}
            <div className="grid grid-cols-2 gap-8 py-5 border-b border-stone-200 text-[11px] font-sans">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block font-mono">DELIVERY DESTINATION</span>
                <p className="font-extrabold text-base text-black">{customerName || 'Walk-in Client'}</p>
                <p className="font-bold mt-1 text-stone-700">WhatsApp: {whatsappNo || 'Not provided'}</p>
                <p className="text-stone-600 mt-1 italic whitespace-pre-wrap">{address || 'No shipping location added.'}</p>
              </div>
              <div className="text-right space-y-1 font-medium">
                <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block font-mono">SPECIFICATION CODES</span>
                <p className="font-bold text-stone-900 text-[12px]">Delivery Schedule: <span className="font-extrabold text-red-900 underline">{deliveryDate ? formatToDDMMYYYY(deliveryDate) : 'Not specified'}</span></p>
                <p className="mt-1 text-stone-700">Polish Tone Shade: <strong className="text-black">{polishShade}</strong></p>
                <p className="text-stone-700">Polish Treatment: <strong className="text-black">{typeOfPolish}</strong></p>
                <p className="text-stone-700">Agreement ID: <strong className="text-black font-mono">AGR-{new Date().toISOString().split('T')[0].replace(/-/g, '').slice(4)}</strong></p>
              </div>
            </div>

            {/* Products specifications table */}
            <div className="py-6 space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-wider font-sans text-stone-800">
                Schedule of Ordered Products &amp; Components:
              </h3>
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b-2 border-black text-stone-500 text-[10px]">
                    <th className="py-2">DETAILED TECHNICAL COMPONENT SPECIFICATION</th>
                    <th className="py-2 text-center">QUANTITY</th>
                    <th className="py-2 text-right">UNIT RATE</th>
                    <th className="py-2 text-right">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, idx) => {
                    const itemSub = (p.quotedRate * p.qty) + p.cushion + p.hardware + p.packingForwarding + p.transportation - p.discount;
                    return (
                      <tr key={p.id || idx} className="border-b border-stone-200">
                        <td className="py-3 font-sans">
                          <span className="text-[13px] font-black text-black block">#{idx + 1}: {p.productName || 'Custom Carpentry'}</span>
                          <span className="text-[10px] text-stone-600 block mt-1 font-mono leading-relaxed">
                            Category: {p.category} | Sub: {p.subCategory} | Size: {p.size === 'Custom' ? p.customSize : p.size} | Material: {p.material} | Finish: {p.finish}
                          </span>
                          {p.specialNotes && (
                            <span className="text-[9.5px] text-stone-500 italic block mt-1.5 font-sans">
                              * Notes: {p.specialNotes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center font-bold text-black font-mono">{p.qty}</td>
                        <td className="py-3 text-right font-mono">₹{p.quotedRate.toLocaleString()}</td>
                        <td className="py-3 text-right font-bold text-black font-mono">₹{itemSub.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial summary aggregation & signatures */}
          <div className="border-t-2 border-black pt-4">
            <div className="grid grid-cols-2 gap-8 font-sans">
              <div className="space-y-1 text-[10px] text-stone-600 font-medium">
                <span className="text-[9px] font-bold text-stone-400 block font-mono">PAYMENT MODE TERMS:</span>
                <p>Deposit Mode Selected: <span className="font-extrabold text-black">{paymentMode}</span></p>
                <p className="mt-1 leading-normal italic text-stone-400">All materials remain the sole property of Shri Samarth Woodworks until full clearance of the consolidated balance due amount.</p>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Gross Invoice Value:</span>
                  <span>₹{totalInvoiced.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-stone-900 border-b border-stone-300 pb-1.5">
                  <span>Less Total Advance Deposited:</span>
                  <span className="font-bold">- ₹{totalAdvancePaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-black text-black text-sm uppercase pt-1 tracking-wider">
                  <span>Balance Due Amount:</span>
                  <span>₹{outstandingBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Signature Area */}
            <div className="flex justify-between items-end pt-12 font-sans text-[10px] font-bold text-stone-400">
              <div className="text-center w-36 border-t border-black pt-1 uppercase">
                Customer Signature &amp; Date
              </div>
              <div className="text-center text-black font-mono text-[11px] font-bold">
                For Shri Samarth Woodworks
              </div>
              <div className="text-center w-36 border-t border-black pt-1 uppercase">
                Authorized Executive Signature
              </div>
            </div>
          </div>
        </div>

        {/* Printable Page 2: Terms & Conditions */}
        <div className="h-[297mm] flex flex-col justify-between p-8 bg-white border border-transparent font-sans">
          <div className="space-y-4">
            <div className="border-b-2 border-black pb-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-black">
                {language === 'mr' ? 'करार आणि अटी' : 'TERMS & CONDITIONS OF SALE'}
              </h2>
              <p className="text-[9px] text-stone-500 uppercase">Shri Samarth Woodworks Standard Purchase Contract Terms</p>
            </div>

            {language === 'mr' ? (
              <div className="text-[10px] space-y-3 text-stone-800 leading-relaxed">
                <p className="font-bold">१. पेमेंट शेड्युल आणि देय रक्कम:</p>
                <p>काम सुरू करण्यापूर्वी मी एकूण आदेशाच्या / ऑर्डरच्या मुल्याच्या <span className="underline font-extrabold text-stone-950">₹{totalAdvancePaid.toLocaleString()}</span> चे ॲडव्हान्स पेमेंट देण्यास सहमत आहे. उर्वरित शिल्लक रक्कम <span className="underline font-extrabold text-stone-950">₹{outstandingBalance.toLocaleString()}</span> डिलिव्हरीपूर्वी अथवा डिलिव्हरीच्या दिवशीच रोख अथवा युपीआय स्वरूपात संपूर्ण भरणे बंधनकारक असेल.</p>
                
                <p className="font-bold">२. डिलिव्हरी मुदत आणि डिझाईन बदल:</p>
                <p>ऑर्डर निश्चित केल्यानंतर डिझाईनमध्ये कोणताही बदल ग्राहकाकडून स्वीकारला जाणार नाही. जर बदल करणे अत्यंत गरजेचे असेल तर त्यासाठी लागणारा जादा साहित्य व मजुरी खर्च ग्राहकास स्वतंत्रपणे द्यावा लागेल. अंदाजे डिलिव्हरी तारीख ही कच्च्या मालाच्या उपलब्धतेवर अवलंबून असते.</p>
                
                <p className="font-bold">३. मालाची मालकी व अधिकार:</p>
                <p>ऑर्डरचे सर्व साहित्य जोपर्यंत पूर्ण देय रक्कम भरली जात नाही, तोपर्यंत ती श्री समर्थ वुडवर्क्स यांच्या अधिकारांतर्गत मालकीची राहील.</p>
                
                <p className="font-bold">४. लाकूड गुणवत्ता व नैसर्गिक छटा:</p>
                <p>सागवानी लाकूड किंवा इतर लाकूड प्रकार हे नैसर्गिक असल्यामुळे त्यावरील डिझाईन किंवा रंगाची छटा काही प्रमाणात नैसर्गिक घटकांनुसार भिन्न असू शकते.</p>
              </div>
            ) : (
              <div className="text-[10.5px] space-y-3.5 text-stone-800 leading-relaxed">
                <p className="font-semibold text-black">1. Payment &amp; Retainage Terms:</p>
                <p>The purchaser agrees to pay an advance sum of <span className="underline font-extrabold text-stone-950">₹{totalAdvancePaid.toLocaleString()}</span> prior to the initiation of any custom fabrication work. The remaining outstanding balance of <span className="underline font-extrabold text-stone-950">₹{outstandingBalance.toLocaleString()}</span> must be cleared in full on or prior to the date of shipping / site delivery validation.</p>
                
                <p className="font-semibold text-black">2. Specification Modifiability:</p>
                <p>No design alterations, structural changes, or dimension adjustments will be accommodated once the raw material cutting phase has commenced. Any critical requested adjustments thereafter will attract a surcharge covering material waste and additional labor overheads.</p>
                
                <p className="font-semibold text-black">3. Title of Ownership:</p>
                <p>The legal title and ownership of all fabricated furniture, fixtures, and materials detailed in this contract shall remain exclusively with Shri Samarth Woodworks until all payments, including transit charges, are cleared in full.</p>
                
                <p className="font-semibold text-black">4. Natural Material Disclaimer:</p>
                <p>Teakwood and natural woods exhibit organic characteristics such as varying grain structures, knots, and shade patterns. Such variation is a mark of authenticity and shall not constitute a defect or grounds for contract rejection.</p>
              </div>
            )}
          </div>

          <div className="border-t border-stone-300 pt-6">
            <p className="text-[9px] text-stone-400 leading-normal mb-8">
              {language === 'mr' ? 'हा करार डिजिटल स्वरूपात जतन केला गेला आहे आणि कायदेशीररित्या दोन्ही बाजूंना बांधील आहे.' : 'This agreement is logged electronically and is legally binding upon both signing parties.'}
            </p>
            <div className="flex justify-between items-end font-sans text-[10px] font-bold text-stone-400">
              <div className="text-center w-36 border-t border-black pt-1 uppercase">
                Customer Signature
              </div>
              <div className="text-center text-black font-mono text-[11px] font-bold">
                Shri Samarth Woodworks Seal
              </div>
              <div className="text-center w-36 border-t border-black pt-1 uppercase">
                Admin Signature
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
