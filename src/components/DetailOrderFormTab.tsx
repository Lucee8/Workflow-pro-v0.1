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

          {/* IV. CUSTOMER WHATSAPP & PDF TRANSMISSION FLOW */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="border-b pb-2">
              <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-mono">Section IV</span>
              <h2 className="text-xs font-black text-emerald-800 uppercase tracking-wider font-display mt-1">IV. Customer WhatsApp &amp; PDF Transmission Flow</h2>
            </div>
            
            <p className="text-stone-500 text-[11px] leading-relaxed">
              To send this agreement directly to the customer's WhatsApp in professional PDF format, follow these quick steps:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-stone-50/60 p-3 rounded-xl border border-stone-200 text-center">
                <span className="inline-flex items-center justify-center bg-stone-200 text-stone-850 h-5 w-5 rounded-full font-bold text-[10px] mb-1.5">1</span>
                <h4 className="text-[10px] font-bold text-stone-850 uppercase tracking-wider">Save Agreement PDF</h4>
                <p className="text-[9px] text-stone-500 mt-1 leading-relaxed">Click the brown 'Print Agreement' button in the preview panel, and choose 'Save as PDF' in your print destination.</p>
              </div>
              
              <div className="bg-stone-50/60 p-3 rounded-xl border border-stone-200 text-center">
                <span className="inline-flex items-center justify-center bg-stone-200 text-stone-850 h-5 w-5 rounded-full font-bold text-[10px] mb-1.5">2</span>
                <h4 className="text-[10px] font-bold text-stone-850 uppercase tracking-wider">Start WhatsApp Chat</h4>
                <p className="text-[9px] text-stone-500 mt-1 leading-relaxed">Click the green 'Send WhatsApp' button. It opens active chat with the saved customer WP details with pre-filled summary.</p>
              </div>

              <div className="bg-stone-50/60 p-3 rounded-xl border border-stone-200 text-center">
                <span className="inline-flex items-center justify-center bg-stone-200 text-stone-850 h-5 w-5 rounded-full font-bold text-[10px] mb-1.5">3</span>
                <h4 className="text-[10px] font-bold text-stone-850 uppercase tracking-wider">Attach Saved PDF</h4>
                <p className="text-[9px] text-stone-500 mt-1 leading-relaxed">Once the WhatsApp interface opens, simply drag and drop or attach the saved PDF agreement file directly into the message box!</p>
              </div>
            </div>

            <div className="border border-emerald-100 bg-emerald-50/25 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block font-mono">Target WhatsApp Recipient</span>
                <strong className="text-stone-800 text-xs mt-0.5 block">{whatsappNo ? `+91 ${whatsappNo}` : 'No phone number set'}</strong>
              </div>
              {whatsappNo ? (
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase py-1.5 px-3 rounded-lg flex items-center gap-1 transition shadow-xs"
                >
                  <Phone size={10} /> Start Chat
                </a>
              ) : (
                <span className="bg-stone-100 text-stone-500 border border-stone-200 text-[9px] font-mono font-bold uppercase py-1 px-2 rounded-lg flex items-center gap-1">
                  ⚠️ No Active Number
                </span>
              )}
            </div>
          </div>

          {/* V. REFERENCE DRAWINGS & BLUEPRINTS */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="border-b pb-2">
              <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-mono">Section V</span>
              <h2 className="text-xs font-black text-amber-800 uppercase tracking-wider font-display mt-1">V. Reference Drawings &amp; Blueprints</h2>
            </div>

            <p className="text-stone-500 text-[11px] leading-relaxed">
              Upload client-approved furniture sketches, material catalogs, or dynamic reference blueprints. These images will render perfectly on page 3 of the printed agreement.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="border border-dashed border-stone-300 rounded-xl p-4 flex flex-col items-center justify-center bg-stone-50 hover:bg-stone-100/50 cursor-pointer transition min-h-[100px]">
                <UploadCloud size={24} className="text-[#593622] mb-1.5" />
                <span className="text-xs font-bold text-stone-850">Upload Files</span>
                <span className="text-[9px] text-stone-400 mt-0.5 font-mono">Supports PNG, JPG, GIF (Max 5MB)</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files) return;
                    Array.from(files).forEach((file: any) => {
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const rawUrl = event.target?.result as string;
                        const compressedUrl = rawUrl; // Use directly
                        setProducts((prev) => {
                          const updated = [...prev];
                          if (updated[0]) {
                            updated[0].refImages = [
                              ...(updated[0].refImages || []),
                              {
                                id: `img_${Math.random().toString(36).substring(2, 9)}`,
                                url: compressedUrl,
                                type: 'Design Reference',
                              }
                            ];
                          }
                          return updated;
                        });
                      };
                      reader.readAsDataURL(file);
                    });
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>

              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block font-mono">Import from URL</span>
                  <p className="text-[9px] text-stone-500 mt-0.5">Paste a remote image address/link directly to render it.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="url-import-input-main"
                    placeholder="https://example.com/furniture-photo.jpg"
                    className="flex-1 px-2 py-1.5 bg-white border border-stone-200 focus:outline-none focus:border-[#593622] rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('url-import-input-main') as HTMLInputElement;
                      if (input && input.value.trim().startsWith('http')) {
                        setProducts((prev) => {
                          const updated = [...prev];
                          if (updated[0]) {
                            updated[0].refImages = [
                              ...(updated[0].refImages || []),
                              {
                                id: `img_${Math.random().toString(36).substring(2, 9)}`,
                                url: input.value.trim(),
                                type: 'Design Reference',
                              }
                            ];
                          }
                          return updated;
                        });
                        input.value = '';
                        alert('URL Image added to Page 3 Reference Gallery!');
                      } else {
                        alert('Please enter a valid image URL link starting with http/https.');
                      }
                    }}
                    className="bg-[#593622] hover:bg-[#402414] text-white text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg transition"
                  >
                    Add URL
                  </button>
                </div>
              </div>
            </div>
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

          <div className="max-h-[85vh] overflow-y-auto pr-2 space-y-6 no-scrollbar border border-stone-200 rounded-2xl bg-stone-100 p-4">
            <div className="text-center font-bold text-stone-900 text-[10px] tracking-wider uppercase pt-2">
              LIVE PREVIEW OF DOCUMENT PAGES (A4 PROPORTION)
            </div>

            {/* Page 1: Detail Order Form */}
            <div className="bg-white border border-stone-300 shadow-md rounded-xl p-5 aspect-[1/1.41] flex flex-col justify-between font-mono relative text-stone-900 text-[9px] leading-relaxed">
              <div className="border-[2px] border-black p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="text-center font-bold text-[11px] tracking-wider uppercase py-1">
                    BHISE'Z WORKSHOP - DETAIL ORDER FORM
                  </div>
                  <hr className="border-t-2 border-black my-2" />

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px] uppercase">
                    <div>ORDER DATE: {orderDate ? formatToDDMMYYYY(orderDate) : '___________'}</div>
                    <div>DELIVERY DATE: {deliveryDate ? formatToDDMMYYYY(deliveryDate) : '___________'}</div>
                    <div>ORDER NO: {products[0]?.orderNo || '___________'}</div>
                    <div>ARTICLE NO: {products[0]?.articleNo || '___________'}</div>
                    <div>TO ARTICLE NO: {products[0]?.toArticleNo || '___________'}</div>
                    <div>WHATSAPP NO: {whatsappNo || '___________'}</div>
                  </div>

                  <hr className="border-t border-black my-2" />

                  <div className="font-mono text-[9px] space-y-1 uppercase">
                    <div>CUSTOMER NAME: <span className="font-bold">{customerName || '___________'}</span></div>
                    <div>ADDRESS: <span className="whitespace-pre-wrap">{address || '___________'}</span></div>
                  </div>

                  <hr className="border-t border-black my-2.5" />

                  {/* Products map */}
                  <div className="space-y-4">
                    {products.map((p, idx) => (
                      <div key={p.id || idx} className="space-y-1 font-mono text-[9px] uppercase">
                        {idx === 0 && <span className="font-bold underline block mb-1">PRODUCT DETAILS:</span>}
                        <div>PRODUCT NAME: {p.productName || p.category} {p.size && `(${p.size === 'Custom' ? p.customSize : p.size})`}</div>
                        <div className="normal-case">ITEM DESCRIPTION: {p.itemDescription || `Structure: Solid wood. Finish: ${p.finish}. Color: ${p.colorShade}.`}</div>
                        <div>QTY: {p.qty} &nbsp;&nbsp; UNIT RATE: ₹{p.quotedRate.toLocaleString()} &nbsp;&nbsp; AMOUNT: ₹{(p.quotedRate * p.qty).toLocaleString()}</div>
                        
                        <hr className="border-t border-black my-2" />
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[8.5px]">
                          <div>QUOTED RATE: ₹{p.quotedRate.toLocaleString()}</div>
                          <div>CUSHION: ₹{p.cushion.toLocaleString()}</div>
                          <div>DISCOUNT: ₹{p.discount.toLocaleString()}</div>
                          <div>HARDWARE: ₹{p.hardware.toLocaleString()}</div>
                          <div>FINAL RATE: ₹{(p.quotedRate - p.discount).toLocaleString()}</div>
                          <div>PACKING &amp; FORWARDING: ₹{p.packingForwarding.toLocaleString()}</div>
                          <div>ADVANCE: ₹{p.advance.toLocaleString()}</div>
                          <div>TRANSPORTATION: ₹{p.transportation.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <hr className="border-t border-dashed border-stone-400 my-2" />

                  <div className="space-y-1 text-[9px] font-mono uppercase">
                    <div className="flex justify-between">
                      <span>TOTAL INVOICED:</span>
                      <span>₹{totalInvoiced.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TOTAL ADVANCE PAID:</span>
                      <span>₹{totalAdvancePaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-800 text-[10px] border-t border-stone-200 pt-0.5 mt-0.5">
                      <span>OUTSTANDING BALANCE:</span>
                      <span>₹{outstandingBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  <hr className="border-t border-dashed border-stone-400 my-2" />

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[8.5px] uppercase font-mono">
                    <div>POLISH SHADE: {polishShade} Finish</div>
                    <div>PAYMENT MODE: {paymentMode}</div>
                    <div className="col-span-2">TYPE OF POLISH: {typeOfPolish} ({typeOfPolish === 'HAND' ? 'HAND' : 'MACHINE'})</div>
                  </div>

                  <hr className="border-t border-black my-3" />

                  <div className="flex justify-between items-end pt-4 text-[8.5px] font-bold font-mono">
                    <div className="text-center w-36">
                      <div className="border-b border-black h-1 w-full mb-1"></div>
                      MANAGER SIGN
                    </div>
                    <div className="text-center w-36">
                      <div className="border-b border-black h-1 w-full mb-1"></div>
                      CUSTOMER SIGN
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Page 2: Terms & Conditions */}
            <div className="bg-white border border-stone-300 shadow-md rounded-xl p-5 aspect-[1/1.41] flex flex-col justify-between font-mono relative text-stone-900 text-[9px] leading-relaxed">
              <div className="border-[2px] border-black p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-center text-[9px] font-bold">
                    <span>PAGE 2</span>
                    <span>TERMS AND CONDITIONS</span>
                    <span>BHISE'Z WORKSHOP</span>
                  </div>
                  <hr className="border-t-2 border-black my-2" />

                  {language === 'mr' ? (
                    <div className="space-y-2 text-[8.5px] leading-relaxed">
                      <p className="font-bold">१. १. ॲडव्हान्स पेमेंटची आवश्यकता:</p>
                      <p>काम सुरू करण्यापूर्वी मी एकूण खरेदी खर्चाच्या <span className="underline font-bold">₹{totalAdvancePaid.toLocaleString()}</span> चे ॲडव्हान्स पेमेंट देण्यास सहमत आहे. ॲडव्हान्स पेमेंट रक्कम <span className="underline font-bold">₹{totalAdvancePaid.toLocaleString()}</span> आहे.</p>
                      
                      <p className="font-bold">२. २. पेमेंट शेड्युल:</p>
                      <p>करारावर स्वाक्षरी केल्यानंतर लगेचच पेमेंट देय आहे. करारामध्ये नमूद केलेल्या देयक वेळापत्रकानुसार उर्वरित देयके दिली जातील. माल पाठविण्यापूर्वी पूर्ण पेमेंट मिळणे आवश्यक आहे.</p>
                      
                      <p className="font-bold">३. ३. नॉन-रिफंडेबल क्लॉज:</p>
                      <p>सेवा प्रदात्याकडून कराराचा भंग झाल्यास वगळता ॲडव्हान्स पेमेंट नॉन-रिफंडेबल असेल. २४ तासानंतर ॲडव्हान्स पेमेंट परत केले जाणार नाही.</p>
                      
                      <p className="font-bold">४. ४. सेवा सुरू करणे:</p>
                      <p>ॲडव्हान्स पेमेंट मिळाल्यानंतर आणि आवश्यक कागदपत्रे किंवा माहिती मिळाल्यानंतर काम सुरू होईल. पेमेंटला विलंब झाल्यास उत्पादनास विलंब होऊ शकतो.</p>
                      
                      <p className="font-bold">५. ५. कामाची व्याप्ती:</p>
                      <p>मूळ ऑर्डरमधील कोणतेही अतिरिक्त बदल किंवा काम अतिरिक्त शुल्कास अधीन असेल.</p>
                      
                      <p className="font-bold">६. ६. डिलिव्हरी:</p>
                      <p>अचूक डिलिव्हरी माहिती प्रदान करण्यास मी जबाबदार आहे. पुरवलेली माहिती चुकीची किंवा अपूर्ण असल्यास डिलिव्हरीच्या अपयशासाठी विक्रेता जबाबदार नाही. डिलिव्हरी तारीख २-३ दिवसांनी बदलू शकते.</p>

                      <p className="font-bold">७. ७. परतावा आणि रीफंड:</p>
                      <p>डिलिव्हरीच्या २ दिवसांच्या आत मी कोणत्याही सदोष किंवा चुकीच्या वस्तूंची माहिती विक्रेत्याला देईन. वस्तू सदोष असल्याशिवाय रिटर्न शिपिंगच्या खर्चासाठी मी जबाबदार राहीन.</p>

                      <p className="font-bold">८. ८. ऑर्डर रद्द करणे:</p>
                      <p>ऑर्डर दिल्यानंतर २४ तासांच्या आत ग्राहक ती रद्द करू शकतात. गैरवापर किंवा चुकीच्या दुरुस्तीमुळे नुकसान झाल्यास विक्रेता जबाबदार नाही.</p>

                      <p className="font-bold">९. ९. अंशतः डिलिव्हरी:</p>
                      <p>अंशतः डिलिव्हरी झाल्यास, मी डिलिव्हरी आणि इन्स्टॉलेशन खर्च देण्यास सहमत आहे. डिलिव्हरी होणाऱ्या वस्तूंची पूर्ण रक्कम आणि भविष्यात डिलिव्हरी होणाऱ्या उर्वरित वस्तूंच्या ४०% रक्कम मी देईन.</p>

                      <p className="font-bold">१०. १०. अटींची स्वीकृती:</p>
                      <p>ॲडव्हान्स पेमेंट करून, मी कबूल करतो की मी या अटी आणि शर्ती वाचल्या, समजल्या ​​आणि त्यांच्याशी सहमत आहे.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-[7.5px] leading-tight">
                      <div>
                        <strong className="block">1. 1. ADVANCE PAYMENT REQUIREMENT:</strong>
                        <span>I agree to pay an advance payment amounting <span className="underline font-bold">₹{totalAdvancePaid.toLocaleString()}</span> of the total order cost prior to the commencement of work. The advance payment amount is <span className="underline font-bold">₹{totalAdvancePaid.toLocaleString()}</span>.</span>
                      </div>
                      <div>
                        <strong className="block">2. 2. PAYMENT SCHEDULE:</strong>
                        <span>The advance payment is due immediately upon signing the contract or agreement. Subsequent payments will be made as per the agreed payment schedule outlined in the main contract. Full payment must be received before the dispatch of goods.</span>
                      </div>
                      <div>
                        <strong className="block">3. 3. NON-REFUNDABLE CLAUSE:</strong>
                        <span>The advance payment is non-refundable except in the event of a breach of contract by the Service Provider. Advance payment will not be refunded after 24 hours.</span>
                      </div>
                      <div>
                        <strong className="block">4. 4. SERVICE COMMENCEMENT:</strong>
                        <span>Work will commence upon receipt of the advance payment and any required documentation or information from you about your requirement. Any delay in the advance payment may result in a corresponding delay in the commencement of manufacturing.</span>
                      </div>
                      <div>
                        <strong className="block">5. 5. SCOPE OF WORK:</strong>
                        <span>Any additional work or changes to the initial order will be subject to additional charges.</span>
                      </div>
                      <div>
                        <strong className="block">6. 6. DELIVERY:</strong>
                        <span>I am responsible for providing accurate delivery information. The Seller is not liable for delivery failures due to incorrect or incomplete information provided by me. The delivery date may vary by 2-3 days.</span>
                      </div>
                      <div>
                        <strong className="block">7. 7. RETURNS AND REFUNDS:</strong>
                        <span>I will notify the Seller of any defective or incorrect items within 2 days of delivery. I am responsible for return shipping costs unless the item is defective or incorrect.</span>
                      </div>
                      <div>
                        <strong className="block">8. 8. ORDER CANCELLATION:</strong>
                        <span>The Buyer may cancel their order within 24 hours of placing it by contacting the Seller. The Seller is not liable if the product is damaged due to misuse, neglect, or unauthorized repair.</span>
                      </div>
                      <div>
                        <strong className="block">9. 9. PART DELIVERY:</strong>
                        <span>In case of part delivery, I agree to pay the delivery charges as well as installation charges. I agree to pay the full amount of the products which are to be delivered and 40% Advance of the remaining products which will be delivered in future.</span>
                      </div>
                      <div>
                        <strong className="block">10. 10. ACCEPTANCE OF TERMS:</strong>
                        <span>By making the advance payment, I acknowledge that I have read, understood, and agree to these terms and conditions.</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-end pt-4 text-[8.5px] font-bold mt-auto">
                  <div className="text-center w-36">
                    <div className="border-b border-black h-1 w-full mb-1"></div>
                    MANAGER SIGNATURE
                  </div>
                  <div className="text-center w-36">
                    <div className="border-b border-black h-1 w-full mb-1"></div>
                    CUSTOMER SIGNATURE
                  </div>
                </div>
              </div>
            </div>

            {/* Page 3: Reference Images */}
            <div className="bg-white border border-stone-300 shadow-md rounded-xl p-5 aspect-[1/1.41] flex flex-col justify-between font-mono relative text-stone-900 text-[9px] leading-relaxed">
              <div className="border-[2px] border-black p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-center text-[9px] font-bold">
                    <span>PAGE 3</span>
                    <span>REFERENCE IMAGES</span>
                    <span>BHISE'Z WORKSHOP</span>
                  </div>
                  <hr className="border-t-2 border-black my-2" />

                  {products.flatMap(p => p.refImages || []).length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {products.flatMap(p => p.refImages || []).map((img, idx) => (
                        <div key={img.id || idx} className="border border-black rounded-lg p-2 bg-white text-center flex flex-col justify-between items-center">
                          <div className="aspect-[4/3] bg-stone-50 flex items-center justify-center overflow-hidden rounded-md mb-2 max-h-[120px] w-full border border-stone-200">
                            <img
                              src={img.url}
                              alt={`Ref #${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <span className="text-[9px] font-bold text-stone-900 font-mono">Ref #{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-stone-300 rounded-xl p-10 text-center text-stone-400 font-mono text-[9px] italic mt-6">
                      No design reference drawings uploaded. Use Section V to map drawings to page 3 of this document.
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-end pt-4 text-[8.5px] font-bold mt-auto">
                  <div className="text-center w-36">
                    <div className="border-b border-black h-1 w-full mb-1"></div>
                    MANAGER SIGNATURE
                  </div>
                  <div className="text-center w-36">
                    <div className="border-b border-black h-1 w-full mb-1"></div>
                    CUSTOMER SIGNATURE
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions box */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2.5 bg-[#593622] hover:bg-[#402414] text-white font-extrabold text-xs uppercase tracking-widest rounded-xl inline-flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Printer size={14} /> Print Agreement Papers
            </button>
            {whatsappNo && (
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl inline-flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Phone size={14} /> Send WhatsApp Specification
              </a>
            )}
          </div>
        </div>
      </div>

      {/* HTML PRINT TEMPLATE (Pure Printable layout, visible only during print stylesheet trigger) */}
      <div id="print-area" className="hidden print:block p-8 font-mono text-[10px] text-black bg-white space-y-10 leading-relaxed">
        {/* Printable Page 1 */}
        <div className="h-[285mm] flex flex-col justify-between p-4 bg-white border-[2.5px] border-black">
          <div>
            <div className="text-center font-bold text-[12px] tracking-wider uppercase py-1">
              BHISE'Z WORKSHOP - DETAIL ORDER FORM
            </div>
            <hr className="border-t-2 border-black my-2" />

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] uppercase">
              <div>ORDER DATE: {orderDate ? formatToDDMMYYYY(orderDate) : '___________'}</div>
              <div>DELIVERY DATE: {deliveryDate ? formatToDDMMYYYY(deliveryDate) : '___________'}</div>
              <div>ORDER NO: {products[0]?.orderNo || '___________'}</div>
              <div>ARTICLE NO: {products[0]?.articleNo || '___________'}</div>
              <div>TO ARTICLE NO: {products[0]?.toArticleNo || '___________'}</div>
              <div>WHATSAPP NO: {whatsappNo || '___________'}</div>
            </div>

            <hr className="border-t border-black my-2" />

            <div className="font-mono text-[10px] space-y-1 uppercase">
              <div>CUSTOMER NAME: <span className="font-bold">{customerName || '___________'}</span></div>
              <div>ADDRESS: <span className="whitespace-pre-wrap">{address || '___________'}</span></div>
            </div>

            <hr className="border-t border-black my-2.5" />

            {/* Products map */}
            <div className="space-y-4">
              {products.map((p, idx) => (
                <div key={p.id || idx} className="space-y-1 font-mono text-[10px] uppercase">
                  {idx === 0 && <span className="font-bold underline block mb-1">PRODUCT DETAILS:</span>}
                  <div>PRODUCT NAME: {p.productName || p.category} {p.size && `(${p.size === 'Custom' ? p.customSize : p.size})`}</div>
                  <div className="normal-case">ITEM DESCRIPTION: {p.itemDescription || `Structure: Solid wood. Finish: ${p.finish}. Color: ${p.colorShade}.`}</div>
                  <div>QTY: {p.qty} &nbsp;&nbsp; UNIT RATE: ₹{p.quotedRate.toLocaleString()} &nbsp;&nbsp; AMOUNT: ₹{(p.quotedRate * p.qty).toLocaleString()}</div>
                  
                  <hr className="border-t border-black my-2" />
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9.5px]">
                    <div>QUOTED RATE: ₹{p.quotedRate.toLocaleString()}</div>
                    <div>CUSHION: ₹{p.cushion.toLocaleString()}</div>
                    <div>DISCOUNT: ₹{p.discount.toLocaleString()}</div>
                    <div>HARDWARE: ₹{p.hardware.toLocaleString()}</div>
                    <div>FINAL RATE: ₹{(p.quotedRate - p.discount).toLocaleString()}</div>
                    <div>PACKING &amp; FORWARDING: ₹{p.packingForwarding.toLocaleString()}</div>
                    <div>ADVANCE: ₹{p.advance.toLocaleString()}</div>
                    <div>TRANSPORTATION: ₹{p.transportation.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <hr className="border-t border-dashed border-stone-400 my-2" />

            <div className="space-y-1 text-[10px] font-mono uppercase">
              <div className="flex justify-between">
                <span>TOTAL INVOICED:</span>
                <span>₹{totalInvoiced.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>TOTAL ADVANCE PAID:</span>
                <span>₹{totalAdvancePaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-800 text-[11px] border-t border-stone-200 pt-0.5 mt-0.5">
                <span>OUTSTANDING BALANCE:</span>
                <span>₹{outstandingBalance.toLocaleString()}</span>
              </div>
            </div>

            <hr className="border-t border-dashed border-stone-400 my-2" />

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9.5px] uppercase font-mono">
              <div>POLISH SHADE: {polishShade} Finish</div>
              <div>PAYMENT MODE: {paymentMode}</div>
              <div className="col-span-2">TYPE OF POLISH: {typeOfPolish} ({typeOfPolish === 'HAND' ? 'HAND' : 'MACHINE'})</div>
            </div>

            <hr className="border-t border-black my-3" />

            <div className="flex justify-between items-end pt-6 text-[10px] font-bold font-mono">
              <div className="text-center w-40">
                <div className="border-b border-black h-1 w-full mb-1"></div>
                MANAGER SIGN
              </div>
              <div className="text-center w-40">
                <div className="border-b border-black h-1 w-full mb-1"></div>
                CUSTOMER SIGN
              </div>
            </div>
          </div>
        </div>

        {/* Printable Page 2: Terms & Conditions */}
        <div className="h-[285mm] flex flex-col justify-between p-4 bg-white border-[2.5px] border-black page-break-before">
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span>PAGE 2</span>
              <span>TERMS AND CONDITIONS</span>
              <span>BHISE'Z WORKSHOP</span>
            </div>
            <hr className="border-t-2 border-black my-2" />

            {language === 'mr' ? (
              <div className="space-y-2 text-[10px] leading-relaxed">
                <p className="font-bold">१. १. ॲडव्हान्स पेमेंटची आवश्यकता:</p>
                <p>काम सुरू करण्यापूर्वी मी एकूण खरेदी खर्चाच्या <span className="underline font-bold">₹{totalAdvancePaid.toLocaleString()}</span> चे ॲडव्हान्स पेमेंट देण्यास सहमत आहे. ॲडव्हान्स पेमेंट रक्कम <span className="underline font-bold">₹{totalAdvancePaid.toLocaleString()}</span> आहे.</p>
                
                <p className="font-bold">२. २. पेमेंट शेड्युल:</p>
                <p>करारावर स्वाक्षरी केल्यानंतर लगेचच पेमेंट देय आहे. करारामध्ये नमूद केलेल्या देयक वेळापत्रकानुसार उर्वरित देयके दिली जातील. माल पाठविण्यापूर्वी पूर्ण पेमेंट मिळणे आवश्यक आहे.</p>
                
                <p className="font-bold">३. ३. नॉन-रिफंडेबल क्लॉज:</p>
                <p>सेवा प्रदात्याकडून कराराचा भंग झाल्यास वगळता ॲडव्हान्स पेमेंट नॉन-रिफंडेबल असेल. २४ तासानंतर ॲडव्हान्स पेमेंट परत केले जाणार नाही.</p>
                
                <p className="font-bold">४. ४. सेवा सुरू करणे:</p>
                <p>ॲडव्हान्स पेमेंट मिळाल्यानंतर आणि आवश्यक कागदपत्रे किंवा माहिती मिळाल्यानंतर काम सुरू होईल. पेमेंटला विलंब झाल्यास उत्पादनास विलंब होऊ शकतो.</p>
                
                <p className="font-bold">५. ५. कामाची व्याप्ती:</p>
                <p>मूळ ऑर्डरमधील कोणतेही अतिरिक्त बदल किंवा काम अतिरिक्त शुल्कास अधीन असेल.</p>
                
                <p className="font-bold">६. ६. डिलिव्हरी:</p>
                <p>अचूक डिलिव्हरी माहिती प्रदान करण्यास मी जबाबदार आहे. पुरवलेली माहिती चुकीची किंवा अपूर्ण असल्यास डिलिव्हरीच्या अपयशासाठी विक्रेता जबाबदार नाही. डिलिव्हरी तारीख २-३ दिवसांनी बदलू शकते.</p>

                <p className="font-bold">७. ७. परतावा आणि रीफंड:</p>
                <p>डिलिव्हरीच्या २ दिवसांच्या आत मी कोणत्याही सदोष किंवा चुकीच्या वस्तूंची माहिती विक्रेत्याला देईन. वस्तू सदोष असल्याशिवाय रिटर्न शिपिंगच्या खर्चासाठी मी जबाबदार राहीन.</p>

                <p className="font-bold">८. ८. ऑर्डर रद्द करणे:</p>
                <p>ऑर्डर दिल्यानंतर २४ तासांच्या आत ग्राहक ती रद्द करू शकतात. गैरवापर किंवा चुकीच्या दुरुस्तीमुळे नुकसान झाल्यास विक्रेता जबाबदार नाही.</p>

                <p className="font-bold">९. ९. अंशतः डिलिव्हरी:</p>
                <p>अंशतः डिलिव्हरी झाल्यास, मी डिलिव्हरी आणि इन्स्टॉलेशन खर्च देण्यास सहमत आहे. डिलिव्हरी होणाऱ्या वस्तूंची पूर्ण रक्कम आणि भविष्यात डिलिव्हरी होणाऱ्या उर्वरित वस्तूंच्या ४०% रक्कम मी देईन.</p>

                <p className="font-bold">१०. १०. अटींची स्वीकृती:</p>
                <p>ॲडव्हान्स पेमेंट करून, मी कबूल करतो की मी या अटी आणि शर्ती वाचल्या, समजल्या ​​आणि त्यांच्याशी सहमत आहे.</p>
              </div>
            ) : (
              <div className="space-y-2 text-[8.5px] leading-snug">
                <div>
                  <strong className="block">1. 1. ADVANCE PAYMENT REQUIREMENT:</strong>
                  <span>I agree to pay an advance payment amounting <span className="underline font-bold">₹{totalAdvancePaid.toLocaleString()}</span> of the total order cost prior to the commencement of work. The advance payment amount is <span className="underline font-bold">₹{totalAdvancePaid.toLocaleString()}</span>.</span>
                </div>
                <div>
                  <strong className="block">2. 2. PAYMENT SCHEDULE:</strong>
                  <span>The advance payment is due immediately upon signing the contract or agreement. Subsequent payments will be made as per the agreed payment schedule outlined in the main contract. Full payment must be received before the dispatch of goods.</span>
                </div>
                <div>
                  <strong className="block">3. 3. NON-REFUNDABLE CLAUSE:</strong>
                  <span>The advance payment is non-refundable except in the event of a breach of contract by the Service Provider. Advance payment will not be refunded after 24 hours.</span>
                </div>
                <div>
                  <strong className="block">4. 4. SERVICE COMMENCEMENT:</strong>
                  <span>Work will commence upon receipt of the advance payment and any required documentation or information from you about your requirement. Any delay in the advance payment may result in a corresponding delay in the commencement of manufacturing.</span>
                </div>
                <div>
                  <strong className="block">5. 5. SCOPE OF WORK:</strong>
                  <span>Any additional work or changes to the initial order will be subject to additional charges.</span>
                </div>
                <div>
                  <strong className="block">6. 6. DELIVERY:</strong>
                  <span>I am responsible for providing accurate delivery information. The Seller is not liable for delivery failures due to incorrect or incomplete information provided by me. The delivery date may vary by 2-3 days.</span>
                </div>
                <div>
                  <strong className="block">7. 7. RETURNS AND REFUNDS:</strong>
                  <span>I will notify the Seller of any defective or incorrect items within 2 days of delivery. I am responsible for return shipping costs unless the item is defective or incorrect.</span>
                </div>
                <div>
                  <strong className="block">8. 8. ORDER CANCELLATION:</strong>
                  <span>The Buyer may cancel their order within 24 hours of placing it by contacting the Seller. The Seller is not liable if the product is damaged due to misuse, neglect, or unauthorized repair.</span>
                </div>
                <div>
                  <strong className="block">9. 9. PART DELIVERY:</strong>
                  <span>In case of part delivery, I agree to pay the delivery charges as well as installation charges. I agree to pay the full amount of the products which are to be delivered and 40% Advance of the remaining products which will be delivered in future.</span>
                </div>
                <div>
                  <strong className="block">10. 10. ACCEPTANCE OF TERMS:</strong>
                  <span>By making the advance payment, I acknowledge that I have read, understood, and agree to these terms and conditions.</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-end pt-6 text-[10px] font-bold font-mono mt-auto">
            <div className="text-center w-40">
              <div className="border-b border-black h-1 w-full mb-1"></div>
              MANAGER SIGNATURE
            </div>
            <div className="text-center w-40">
              <div className="border-b border-black h-1 w-full mb-1"></div>
              CUSTOMER SIGNATURE
            </div>
          </div>
        </div>

        {/* Printable Page 3: Reference Images */}
        <div className="h-[285mm] flex flex-col justify-between p-4 bg-white border-[2.5px] border-black page-break-before font-mono">
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span>PAGE 3</span>
              <span>REFERENCE IMAGES</span>
              <span>BHISE'Z WORKSHOP</span>
            </div>
            <hr className="border-t-2 border-black my-2" />

            {products.flatMap(p => p.refImages || []).length > 0 ? (
              <div className="grid grid-cols-2 gap-4 mt-6">
                {products.flatMap(p => p.refImages || []).map((img, idx) => (
                  <div key={img.id || idx} className="border border-black rounded-lg p-3 bg-white text-center flex flex-col justify-between items-center">
                    <div className="aspect-[4/3] bg-stone-50 flex items-center justify-center overflow-hidden rounded-md mb-2 max-h-[160px] w-full border border-stone-200">
                      <img
                        src={img.url}
                        alt={`Ref #${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-stone-900 font-mono">Ref #{idx + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-stone-300 rounded-xl p-16 text-center text-stone-400 font-mono text-[10px] italic mt-6">
                No design reference drawings uploaded. Use Section V to map drawings to page 3 of this document.
              </div>
            )}
          </div>

          <div className="flex justify-between items-end pt-6 text-[10px] font-bold font-mono mt-auto font-mono">
            <div className="text-center w-40">
              <div className="border-b border-black h-1 w-full mb-1"></div>
              MANAGER SIGNATURE
            </div>
            <div className="text-center w-40">
              <div className="border-b border-black h-1 w-full mb-1"></div>
              CUSTOMER SIGNATURE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
