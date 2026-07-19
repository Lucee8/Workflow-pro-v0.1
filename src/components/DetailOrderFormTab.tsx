import React from 'react';
import { Customer, Order, User, Payment } from '../types';
import { FileText, Printer, Sparkles, RefreshCw, AlertCircle, ArrowLeft, Trash2, Plus, Minus, UploadCloud, HardHat, ChevronRight } from 'lucide-react';
import { formatToDDMMYYYY } from '../utils';

interface AgreementItem {
  id: string;
  category: string; 
  subCategory: string;
  size: string;
  customSize: string;
  designType: 'Standard' | 'Custom';
  material: string;
  finish: string;
  colorShade: string;
  specialNotes: string;
  qty: number;
  quotedRate: number;
  cushion: number;
  discount: number;
  hardware: number;
  productName: string;
  itemDescription: string;
}

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

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

interface DetailOrderFormTabProps {
  orders: Order[];
  customers: Customer[];
  users: User[];
  payments: Payment[];
  crmQuotations?: any[];
  crmCustomers?: any[];
  preselectedQuotationId?: string | null;
  onClearPreselectedQuotation?: () => void;
  onSendToWorkOrder?: (draft: any) => void;
}

export default function DetailOrderFormTab({ 
  orders, 
  customers, 
  users, 
  payments,
  crmQuotations = [],
  crmCustomers = [],
  preselectedQuotationId = null,
  onClearPreselectedQuotation,
  onSendToWorkOrder
}: DetailOrderFormTabProps) {
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>('');
  const [language, setLanguage] = React.useState<'en' | 'mr'>('en');

  const [items, setItems] = React.useState<AgreementItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = React.useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [selectedQuoteItems, setSelectedQuoteItems] = React.useState<Array<{ quoteId: string; item: any; customer: any; notes: string; created_at: string; validUntil: string }>>([]);
  const isUpdatingRef = React.useRef(false);

  function generateNewOrderNo(targetDate?: string, orderList: Order[] = orders) {
    const dateToUse = targetDate || new Date().toISOString().split('T')[0];
    let yy = '';
    let mm = '';
    if (dateToUse && dateToUse.includes('-')) {
      const parts = dateToUse.split('-');
      if (parts[0] && parts[0].length === 4) {
        yy = parts[0].slice(-2);
      }
      if (parts[1]) {
        mm = parts[1].padStart(2, '0');
      }
    } else if (dateToUse && dateToUse.includes('/')) {
      const parts = dateToUse.split('/');
      if (parts[2] && parts[2].length === 4) {
        yy = parts[2].slice(-2);
      }
      if (parts[1]) {
        mm = parts[1].padStart(2, '0');
      }
    } else {
      const d = new Date();
      yy = d.getFullYear().toString().slice(-2);
      mm = String(d.getMonth() + 1).padStart(2, '0');
    }
    const prefix = `ORD${yy}${mm}`;
    
    let maxSerial = 0;
    if (orderList && orderList.length > 0) {
      orderList.forEach((o) => {
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
    const sss = String(nextSerial).padStart(3, '0');
    return `${prefix}${sss}`;
  }

  // Form Fields - Page 1
  const [orderDate, setOrderDate] = React.useState(() => formatToDDMMYYYY(new Date().toISOString().split('T')[0]));
  const [deliveryDate, setDeliveryDate] = React.useState('');
  const [orderNo, setOrderNo] = React.useState(() => generateNewOrderNo());
  const [articleNo, setArticleNo] = React.useState('');
  const [toArticleNo, setToArticleNo] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [whatsappNo, setWhatsappNo] = React.useState('');
  const [address, setAddress] = React.useState('');

  const [productName, setProductName] = React.useState('');
  const [itemDescription, setItemDescription] = React.useState('');
  const [qty, setQty] = React.useState<number>(1);
  const [amount, setAmount] = React.useState<number>(0);

  const [quotedRate, setQuotedRate] = React.useState<number>(0);
  const [cushion, setCushion] = React.useState<number>(0);
  const [discount, setDiscount] = React.useState<number>(0);
  const [hardware, setHardware] = React.useState<number>(0);
  
  // Product Configuration states
  const [category, setCategory] = React.useState('Door Frames');
  const [subCategory, setSubCategory] = React.useState('Set');
  const [size, setSize] = React.useState('6ft');
  const [customSize, setCustomSize] = React.useState('');
  const [designType, setDesignType] = React.useState<'Standard' | 'Custom'>('Standard');
  const [material, setMaterial] = React.useState('Sagwan');
  const [finish, setFinish] = React.useState('Hand Polish');
  const [colorShade, setColorShade] = React.useState('Walnut');
  const [specialNotes, setSpecialNotes] = React.useState('');

  // Reference Images
  const [refImages, setRefImages] = React.useState<Array<{ id: string; url: string; type: 'Design Reference' }>>([]);
  const [imgUrlInput, setImgUrlInput] = React.useState('');

  // Handle local image file load & compression to keep size optimal
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

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawUrl = event.target?.result as string;
        const compressedUrl = await compressImage(rawUrl);
        setRefImages((prev) => [
          ...prev,
          {
            id: `img_${Math.random().toString(36).substring(2, 9)}`,
            url: compressedUrl,
            type: 'Design Reference',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    if (!imgUrlInput.trim()) return;
    setRefImages((prev) => [
      ...prev,
      {
        id: `img_${Math.random().toString(36).substring(2, 9)}`,
        url: imgUrlInput.trim(),
        type: 'Design Reference',
      },
    ]);
    setImgUrlInput('');
  };

  const handleRemoveImage = (id: string) => {
    setRefImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Initialize with a default product if empty
  React.useEffect(() => {
    if (items.length === 0) {
      setItems([
        {
          id: `item_${Math.random().toString(36).substring(2, 9)}`,
          category: 'Door Frames',
          subCategory: 'Set',
          size: '6ft',
          customSize: '',
          designType: 'Standard',
          material: 'Sagwan',
          finish: 'Hand Polish',
          colorShade: 'Walnut',
          specialNotes: '',
          qty: 1,
          quotedRate: 0,
          cushion: 0,
          discount: 0,
          hardware: 0,
          productName: 'Door Frames › Set (6ft)',
          itemDescription: 'Structure: Sagwan. Finish: Hand Polish. Color: Walnut.',
        },
      ]);
      setActiveItemIndex(0);
    }
  }, [items]);

  // Synchronize active item in state when edit form fields change
  React.useEffect(() => {
    if (isUpdatingRef.current) return;
    setItems((prev) => {
      const updated = [...prev];
      if (updated[activeItemIndex]) {
        updated[activeItemIndex] = {
          ...updated[activeItemIndex],
          category,
          subCategory,
          size,
          customSize,
          designType,
          material,
          finish,
          colorShade,
          specialNotes,
          qty,
          quotedRate,
          cushion,
          discount,
          hardware,
          productName,
          itemDescription,
        };
      }
      return updated;
    });
  }, [
    category,
    subCategory,
    size,
    customSize,
    designType,
    material,
    finish,
    colorShade,
    specialNotes,
    qty,
    quotedRate,
    cushion,
    discount,
    hardware,
    productName,
    itemDescription,
    activeItemIndex,
  ]);

  const loadItemToForm = (index: number) => {
    const item = items[index];
    if (!item) return;
    isUpdatingRef.current = true;
    setActiveItemIndex(index);
    setCategory(item.category);
    setSubCategory(item.subCategory);
    setSize(item.size);
    setCustomSize(item.customSize);
    setDesignType(item.designType);
    setMaterial(item.material);
    setFinish(item.finish);
    setColorShade(item.colorShade);
    setSpecialNotes(item.specialNotes);
    setQty(item.qty);
    setQuotedRate(item.quotedRate);
    setCushion(item.cushion);
    setDiscount(item.discount);
    setHardware(item.hardware);
    setProductName(item.productName);
    setItemDescription(item.itemDescription);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 50);
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const container = document.getElementById('quotation-multiselect-container');
      if (container && !container.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Synchronize product name & item description dynamically
  React.useEffect(() => {
    const nameStr = `${category} › ${subCategory} (${size === 'Custom' ? customSize || 'Custom Size' : size})`;
    setProductName(nameStr);
  }, [category, subCategory, size, customSize]);

  React.useEffect(() => {
    const descStr = `Structure: ${material}. Finish: ${finish}. Color: ${colorShade}. ${specialNotes}`;
    setItemDescription(descStr);
  }, [material, finish, colorShade, specialNotes]);

  React.useEffect(() => {
    if (!selectedOrderId && (!orderNo || orderNo.startsWith('ORD'))) {
      setOrderNo(generateNewOrderNo(orderDate));
    }
  }, [orderDate, selectedOrderId, orders]);

  // Final Rate is calculated as: Quoted Rate + Cushion + Hardware - Discount
  const finalRate = React.useMemo(() => {
    return Math.max(0, Number(quotedRate) + Number(cushion) + Number(hardware) - Number(discount));
  }, [quotedRate, cushion, hardware, discount]);

  const [packingForwarding, setPackingForwarding] = React.useState<number>(0);
  const [advance, setAdvance] = React.useState<number>(0);
  const [transportation, setTransportation] = React.useState<number>(0);

  // Totals calculated across all items in the agreement
  const itemsSubtotal = React.useMemo(() => {
    return items.reduce((sum, item) => {
      const itemFinalRate = Math.max(0, Number(item.quotedRate) + Number(item.cushion) + Number(item.hardware) - Number(item.discount));
      return sum + (itemFinalRate * Number(item.qty));
    }, 0);
  }, [items]);

  const totalInvoiced = React.useMemo(() => {
    return itemsSubtotal + Number(packingForwarding) + Number(transportation);
  }, [itemsSubtotal, packingForwarding, transportation]);

  const balance = React.useMemo(() => {
    return Math.max(0, totalInvoiced - Number(advance));
  }, [totalInvoiced, advance]);

  const totalAdvancePaid = React.useMemo(() => {
    return Number(advance);
  }, [advance]);

  const outstandingBalance = balance;

  const [polishShade, setPolishShade] = React.useState('');
  const [paymentMode, setPaymentMode] = React.useState<'CASH' | 'BANK'>('CASH');
  const [typeOfPolish, setTypeOfPolish] = React.useState<'HAND' | 'MACHINE'>('HAND');

  const handleSendToWorkOrder = () => {
    if (!customerName.trim()) {
      alert('Please fill in the Customer Name.');
      return;
    }
    if (!whatsappNo.trim()) {
      alert('Please fill in the WhatsApp Number.');
      return;
    }
    if (size === 'Custom' && !customSize.trim()) {
      alert('Please specify Custom Size details.');
      return;
    }

    const draft = {
      items, // Send all items in the combined agreement!
      category,
      subCategory,
      size,
      customSize,
      designType,
      material,
      finish,
      colorShade,
      qty,
      specialNotes,
      customerName,
      whatsappNo,
      address,
      refImages,
      quotedRate,
      cushion,
      discount,
      hardware,
      packingForwarding,
      transportation,
      advance,
      orderDate,
      deliveryDate,
      productName,
      itemDescription,
      amount,
      finalRate,
      balance,
      polishShade,
      paymentMode,
      typeOfPolish,
      orderNo,
      articleNo,
      toArticleNo
    };

    if (onSendToWorkOrder) {
      onSendToWorkOrder(draft);
    }
  };

  const approvedQuotations = React.useMemo(() => {
    return (crmQuotations || []).filter((q) => q.status === 'Approved');
  }, [crmQuotations]);

  // Group approved quotations by customer
  const quotationsByCustomer = React.useMemo(() => {
    const groups: Record<string, {
      customerName: string;
      customerId: string;
      customerPhone: string;
      customerAddress: string;
      customerCity: string;
      customerState: string;
      customerPinCode: string;
      items: Array<{
        quoteId: string;
        quoteItem: any;
        quoteNotes: string;
        quoteCreatedAt: string;
        quoteValidUntil: string;
      }>;
    }> = {};

    approvedQuotations.forEach((quote) => {
      const custId = quote.customer_id || 'unknown';
      const crmCust = crmCustomers?.find((c) => c.id === custId);
      const custName = quote.customer_name || crmCust?.name || 'Unknown Customer';
      
      if (!groups[custId]) {
        groups[custId] = {
          customerName: custName,
          customerId: custId,
          customerPhone: crmCust?.phone || crmCust?.whatsappNumber || '',
          customerAddress: crmCust?.address || '',
          customerCity: crmCust?.city || '',
          customerState: crmCust?.state || 'Maharashtra',
          customerPinCode: crmCust?.pinCode || '',
          items: [],
        };
      }

      (quote.items || []).forEach((item: any) => {
        groups[custId].items.push({
          quoteId: quote.id,
          quoteItem: item,
          quoteNotes: quote.notes || '',
          quoteCreatedAt: quote.created_at,
          quoteValidUntil: quote.validUntil,
        });
      });
    });

    return Object.values(groups);
  }, [approvedQuotations, crmCustomers]);

  const handleToggleQuoteItem = (
    quoteId: string,
    item: any,
    customer: any,
    notes: string,
    created_at: string,
    validUntil: string
  ) => {
    setSelectedQuoteItems((prev) => {
      const exists = prev.some((p) => p.quoteId === quoteId && p.item.id === item.id);
      let next = [];
      if (exists) {
        next = prev.filter((p) => !(p.quoteId === quoteId && p.item.id === item.id));
      } else {
        const hasDifferentCustomer = prev.length > 0 && prev[0].customer.id !== customer.id;
        if (hasDifferentCustomer) {
          next = [{ quoteId, item, customer, notes, created_at, validUntil }];
        } else {
          next = [...prev, { quoteId, item, customer, notes, created_at, validUntil }];
        }
      }

      loadSelectedQuoteItems(next);
      return next;
    });
  };

  const loadSelectedQuoteItems = (selectedItems: Array<{ quoteId: string; item: any; customer: any; notes: string; created_at: string; validUntil: string }>) => {
    if (selectedItems.length === 0) {
      clearForm();
      return;
    }

    const first = selectedItems[0];
    const { customer } = first;

    setCustomerName(customer.name || customer.customerName || '');
    setWhatsappNo(customer.phone || customer.whatsappNumber || '');
    
    // Construct multi-line address with City, State, PIN
    const city = customer.city || '';
    const state = customer.state || 'Maharashtra';
    const pin = customer.pinCode || '';
    const addressLines = [
      customer.address || '',
      `City : ${city}`,
      `State : ${state}`,
      `PIN Code : ${pin}`
    ].filter(line => line.trim().length > 0).join('\n');
    setAddress(addressLines);

    const uniqueQuoteIds = Array.from(new Set(selectedItems.map((s) => s.quoteId)));
    
    // Generate order number in ORDYYMM000 format
    const quoteDate = first.created_at ? first.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    setOrderNo(generateNewOrderNo(quoteDate));
    
    // Leave article number blank for manual entry
    setArticleNo('');
    setToArticleNo('');

    setOrderDate(formatToDDMMYYYY(quoteDate));
    setDeliveryDate(formatToDDMMYYYY(first.validUntil ? first.validUntil.split('T')[0] : ''));

    const mappedItems: AgreementItem[] = selectedItems.map((selected) => {
      const { quoteId, item, notes } = selected;
      
      let matchedCat = 'Beds';
      for (const [cat, subs] of Object.entries(CATEGORY_MAP)) {
        if (subs.some((s) => item.furnitureItem.toLowerCase().includes(s.toLowerCase()))) {
          matchedCat = cat;
          break;
        }
      }

      const nameStr = `${matchedCat} › ${item.furnitureItem} (Custom Size)`;
      const descStr = `Structure: ${item.material || 'Sagwan'}. Finish: Hand Polish. Color: Walnut. ${notes || ''}`;

      return {
        id: `quote_item_${quoteId}_${item.id}`,
        category: matchedCat,
        subCategory: item.furnitureItem,
        size: 'Custom',
        customSize: item.dimensions || '',
        designType: 'Standard' as const,
        material: item.material || 'Sagwan',
        finish: 'Hand Polish',
        colorShade: 'Walnut',
        specialNotes: notes || '',
        qty: item.quantity || 1,
        quotedRate: item.unitPrice || 0,
        cushion: 0,
        discount: item.quantity ? (item.discount || 0) / item.quantity : (item.discount || 0),
        hardware: 0,
        productName: nameStr,
        itemDescription: descStr,
      };
    });

    setItems(mappedItems);
    setActiveItemIndex(0);

    const firstItem = mappedItems[0];
    if (firstItem) {
      isUpdatingRef.current = true;
      setCategory(firstItem.category);
      setSubCategory(firstItem.subCategory);
      setSize(firstItem.size);
      setCustomSize(firstItem.customSize);
      setDesignType(firstItem.designType);
      setMaterial(firstItem.material);
      setFinish(firstItem.finish);
      setColorShade(firstItem.colorShade);
      setSpecialNotes(firstItem.specialNotes);
      setQty(firstItem.qty);
      setQuotedRate(firstItem.quotedRate);
      setCushion(firstItem.cushion);
      setDiscount(firstItem.discount);
      setHardware(firstItem.hardware);
      setProductName(firstItem.productName);
      setItemDescription(firstItem.itemDescription);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
    }

    setSelectedOrderId('');
  };

  // Load selection logic for either active workshop orders or approved quotations
  const handleLoad = (combinedId: string) => {
    if (!combinedId) {
      clearForm();
      return;
    }

    if (combinedId.startsWith('quote_')) {
      const quoteId = combinedId.replace('quote_', '');
      const quote = crmQuotations?.find((q) => q.id === quoteId);
      if (!quote) return;

      setSelectedOrderId(combinedId);

      const crmCust = crmCustomers?.find((c) => c.id === quote.customer_id);
      const customerObj = crmCust || { id: quote.customer_id, name: quote.customer_name };

      const quotationItems = (quote.items || []).map((item: any) => ({
        quoteId: quote.id,
        item,
        customer: {
          id: customerObj.id,
          name: customerObj.name || customerObj.customerName,
          customerName: customerObj.name || customerObj.customerName,
          phone: customerObj.phone || customerObj.whatsappNumber || '',
          address: customerObj.address || '',
          city: customerObj.city || '',
          state: customerObj.state || 'Maharashtra',
          pinCode: customerObj.pinCode || '',
        },
        notes: quote.notes || '',
        created_at: quote.created_at,
        validUntil: quote.validUntil
      }));

      setSelectedQuoteItems(quotationItems);
      loadSelectedQuoteItems(quotationItems);

    } else if (combinedId.startsWith('order_')) {
      const orderId = combinedId.replace('order_', '');
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      setSelectedOrderId(combinedId);
      setSelectedQuoteItems([]); // reset multi-quote selection

      const cust = customers.find((c) => c.id === order.customer_id);
      const orderPayment = payments ? payments.find((p) => p.order_id === order.id) : null;
      const orderAdvance = orderPayment ? orderPayment.advance_paid : 0;

      setOrderDate(formatToDDMMYYYY(order.order_date || new Date().toISOString().split('T')[0]));
      setDeliveryDate(formatToDDMMYYYY(order.delivery_date || ''));
      setOrderNo(order.id);
      setArticleNo(order.article_no || '');
      setToArticleNo('');
      setCustomerName(cust ? cust.name : '');
      setWhatsappNo(cust ? cust.phone : '');
      setAddress(cust && cust.address ? cust.address : '');

      const ordItem: AgreementItem = {
        id: `ord_item_${order.id}`,
        category: order.category || 'Beds',
        subCategory: order.sub_category || 'Custom',
        size: order.size || 'Custom',
        customSize: order.custom_size || '',
        designType: order.design_type || 'Standard',
        material: order.material || 'Sagwan',
        finish: order.finish_type || order.finish || 'Hand Polish',
        colorShade: order.color_shade || 'Walnut',
        specialNotes: order.special_notes || '',
        qty: order.no_of_units || 1,
        quotedRate: 15000,
        cushion: 0,
        discount: 0,
        hardware: 0,
        productName: `${order.category || 'Beds'} › ${order.sub_category || 'Custom'} (${order.size || 'Custom'})`,
        itemDescription: `Structure: ${order.material || 'Sagwan'}. Finish: ${order.finish_type || order.finish || 'Hand Polish'}. Color: ${order.color_shade || 'Walnut'}. ${order.special_notes || ''}`,
      };

      setItems([ordItem]);
      setActiveItemIndex(0);

      setCategory(ordItem.category);
      setSubCategory(ordItem.subCategory);
      setSize(ordItem.size);
      setCustomSize(ordItem.customSize);
      setDesignType(ordItem.designType);
      setMaterial(ordItem.material);
      setFinish(ordItem.finish);
      setColorShade(ordItem.colorShade);
      setSpecialNotes(ordItem.specialNotes);
      setQty(ordItem.qty);
      setQuotedRate(ordItem.quotedRate);
      setCushion(ordItem.cushion);
      setDiscount(ordItem.discount);
      setHardware(ordItem.hardware);
      setProductName(ordItem.productName);
      setItemDescription(ordItem.itemDescription);

      setPackingForwarding(1200);
      setTransportation(1800);
      setAdvance(orderAdvance);

      setPolishShade(order.color_shade || 'Natural');
      setTypeOfPolish((order.finish_type || order.finish || '').toLowerCase().includes('hand') ? 'HAND' : 'MACHINE');

      if (order.images && order.images.length > 0) {
        setRefImages(
          order.images.map((img) => ({
            id: img.id,
            url: img.url,
            type: 'Design Reference',
          }))
        );
      } else {
        setRefImages([]);
      }
    }
  };

  React.useEffect(() => {
    if (preselectedQuotationId && crmQuotations && crmQuotations.length > 0) {
      handleLoad(`quote_${preselectedQuotationId}`);
      if (onClearPreselectedQuotation) {
        onClearPreselectedQuotation();
      }
    }
  }, [preselectedQuotationId, crmQuotations]);

  const handlePrint = () => {
    window.print();
  };

  const getWhatsAppUrl = () => {
    const cleanNumber = whatsappNo.replace(/\D/g, '');
    const isMr = language === 'mr';
    const text = isMr ? `*मिसळ लाकूड काम (BHISE'Z WOOD WORKSHOP)*
_ऑर्डर कराराची अधिकृत पुष्टी_

प्रिय *${customerName || 'ग्राहक'}*,

कृपया आपल्या ऑर्डर *#${orderNo || 'N/A'}* साठी सोबत जोडलेला अधिकृत *Agreement Form.pdf* तपासा. (आर्टिकल क्रमांक: ${articleNo || 'N/A'})

*उर्वरित शिल्लक रक्कम:* ₹${balance.toLocaleString()}

भिसेज् वुड वर्कशॉप निवडल्याबद्दल धन्यवाद!`
    : `*BHISE'Z WOOD WORKSHOP*
_Order Agreement Confirmation_

Dear *${customerName || 'Customer'}*,

Please find attached the official *Agreement Form.pdf* for your order *#${orderNo || 'N/A'}*. (Article No: ${articleNo || 'N/A'})

*Outstanding Balance:* ₹${balance.toLocaleString()}

Thank you for choosing *Bhise'z Wood Workshop*!`;

    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${cleanNumber}?text=${encodedText}`;
  };

  const clearForm = () => {
    setSelectedOrderId('');
    setSelectedQuoteItems([]);
    const today = formatToDDMMYYYY(new Date().toISOString().split('T')[0]);
    setOrderDate(today);
    setDeliveryDate('');
    setOrderNo(generateNewOrderNo(today));
    setArticleNo('');
    setToArticleNo('');
    setCustomerName('');
    setWhatsappNo('');
    setAddress('');
    setProductName('');
    setItemDescription('');
    setQty(1);
    setAmount(0);
    setQuotedRate(0);
    setCushion(0);
    setDiscount(0);
    setHardware(0);
    setPackingForwarding(0);
    setTransportation(0);
    setAdvance(0);
    setPolishShade('');
    setPaymentMode('CASH');
    setTypeOfPolish('HAND');
    setItems([
      {
        id: `item_${Math.random().toString(36).substring(2, 9)}`,
        category: 'Door Frames',
        subCategory: 'Set',
        size: '6ft',
        customSize: '',
        designType: 'Standard',
        material: 'Sagwan',
        finish: 'Hand Polish',
        colorShade: 'Walnut',
        specialNotes: '',
        qty: 1,
        quotedRate: 0,
        cushion: 0,
        discount: 0,
        hardware: 0,
        productName: 'Door Frames › Set (6ft)',
        itemDescription: 'Structure: Sagwan. Finish: Hand Polish. Color: Walnut.',
      }
    ]);
    setActiveItemIndex(0);
  };

  const itemPages = React.useMemo(() => {
    return chunkArray(items, 2);
  }, [items]);

  const imagePages = React.useMemo(() => {
    return chunkArray(refImages, 4);
  }, [refImages]);

  return (
    <div className="space-y-6 font-sans pb-16">
      
      {/* SCREEN COMPONENT: Tab Header & Form Loader */}
      <div className="print:hidden space-y-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight font-display flex items-center gap-2">
            <FileText className="text-[#593622]" size={24} />
            Detail Order & Print Agreement Form
          </h1>
          <p className="text-stone-500 text-xs">
            Generate formal multi-page specification forms with itemized billing and integrated legal terms for clients.
          </p>
        </div>

        {/* Language Selection Card */}
        <div className="bg-gradient-to-r from-amber-50 to-stone-100 p-4 rounded-2xl border border-stone-200/80 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="bg-[#593622] text-white p-2.5 rounded-xl flex items-center justify-center font-bold text-sm tracking-wide shadow-sm h-10 w-10 shrink-0">
              {language === 'mr' ? 'म' : 'EN'}
            </div>
            <div>
              <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                Agreement Print Language / कराराची भाषा निवडा
              </h3>
              <p className="text-[11px] text-stone-500">
                Switch language to instantly translate the printed pages and PDF document for customers.
              </p>
            </div>
          </div>
          <div className="flex bg-stone-200/60 p-1 rounded-xl border border-stone-300/40 w-full md:w-auto shrink-0 max-w-sm">
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                language === 'en'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-850'
              }`}
            >
              <span>🇬🇧 English</span>
            </button>
            <button
              onClick={() => setLanguage('mr')}
              className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                language === 'mr'
                  ? 'bg-[#593622] text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-850'
              }`}
            >
              <span>🇮🇳 मराठी (Marathi)</span>
              <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse font-sans">90%</span>
            </button>
          </div>
        </div>

        {/* Existing order selector toolbar */}
        <div className="bg-[#fcfbfa]/80 p-4 rounded-2xl border border-stone-200/60 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <span className="text-xs font-bold text-stone-600 shrink-0">Auto-Fill:</span>
            <select
              value={selectedOrderId}
              onChange={(e) => handleLoad(e.target.value)}
              className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#593622] text-stone-750 font-semibold w-full sm:w-64 max-w-sm"
            >
              <option value="">-- Select active order or approved quotation --</option>
              <optgroup label="Approved Quotations (Pending Production)">
                {crmQuotations?.filter((q) => q.status === 'Approved').map((quote) => (
                  <option key={`quote_${quote.id}`} value={`quote_${quote.id}`}>
                    {quote.id} • {quote.customer_name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Active Workshop Orders">
                {orders.map((ord) => {
                  const cust = customers.find((c) => c.id === ord.customer_id);
                  return (
                    <option key={`order_${ord.id}`} value={`order_${ord.id}`}>
                      {ord.article_no || ord.id} • {cust?.name || 'Unknown'} ({ord.sub_category})
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={clearForm}
              className="px-3 py-1.5 border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold rounded-lg flex items-center gap-1 transition"
            >
              <RefreshCw size={13} />
              Reset Form
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#593622] hover:bg-[#402414] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer size={13} />
              Print Agreement Papers
            </button>
          </div>
        </div>

        {/* COMBINE MULTIPLE QUOTATIONS WIDGET */}
        {quotationsByCustomer.length > 0 && (
          <div className="bg-gradient-to-br from-amber-50/20 to-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#593622]" />
                Combine Multiple Approved Quotations / Items:
              </span>
              <span className="text-[10px] bg-[#593622]/10 text-[#593622] px-2 py-0.5 rounded-full font-bold">
                {selectedQuoteItems.length} items combined
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-1">
              {quotationsByCustomer.map((custGroup) => {
                const isThisCustSelected = selectedQuoteItems.some(
                  (item) => item.customer.id === custGroup.customerId
                );
                return (
                  <div
                    key={custGroup.customerId}
                    className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                      isThisCustSelected
                        ? 'bg-amber-50/45 border-amber-200 shadow-xs'
                        : 'bg-white border-stone-200/80 hover:border-stone-300'
                    }`}
                  >
                    <div className="font-extrabold text-stone-850 flex justify-between items-center">
                      <span className="truncate">{custGroup.customerName}</span>
                      <span className="text-[10px] text-stone-500 font-normal shrink-0">
                        {custGroup.customerPhone}
                      </span>
                    </div>
                    <div className="space-y-1 pl-1 max-h-24 overflow-y-auto pr-0.5">
                      {custGroup.items.map(({ quoteId, quoteItem, quoteNotes, quoteCreatedAt, quoteValidUntil }) => {
                        const isChecked = selectedQuoteItems.some(
                          (p) => p.quoteId === quoteId && p.item.id === quoteItem.id
                        );
                        return (
                          <label
                            key={`${quoteId}_${quoteItem.id}`}
                            className="flex items-start gap-2 p-1 py-1.5 rounded hover:bg-stone-50 cursor-pointer select-none border-b border-stone-100 last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                handleToggleQuoteItem(
                                  quoteId,
                                  quoteItem,
                                  {
                                    id: custGroup.customerId,
                                    name: custGroup.customerName,
                                    phone: custGroup.customerPhone,
                                    address: custGroup.customerAddress,
                                    city: custGroup.customerCity,
                                    state: custGroup.customerState,
                                    pinCode: custGroup.customerPinCode,
                                  },
                                  quoteNotes,
                                  quoteCreatedAt,
                                  quoteValidUntil
                                )
                              }
                              className="mt-0.5 rounded border-stone-300 text-[#593622] focus:ring-[#593622] h-3.5 w-3.5"
                            />
                            <div className="leading-tight">
                              <span className="font-bold text-stone-800">
                                {quoteItem.furnitureItem}
                              </span>{' '}
                              <span className="text-stone-400 text-[10px]">
                                ({quoteItem.dimensions || 'Custom'})
                              </span>
                              <div className="text-[9px] text-stone-500 mt-0.5">
                                Qty: {quoteItem.quantity} • Rate: ₹{quoteItem.unitPrice?.toLocaleString()} • Ref: {quoteId}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DYNAMIC FORM GRID (SCREEN VIEW ONLY) */}
      <div className="print:hidden grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* EDIT FORM COLUMN */}
        <div className="lg:col-span-12 xl:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-xs">
          
          <div>
            <span className="bg-[#593622]/10 text-[#593622] px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase block w-max mb-1.5">Page 1 Specifications</span>
            <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider border-b pb-2">I. Client &amp; Metadata Parameters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Order Date</label>
              <input
                type="text"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Delivery Date</label>
              <input
                type="text"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Order No</label>
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="e.g. ord_a901"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Article No</label>
              <input
                type="text"
                value={articleNo}
                onChange={(e) => setArticleNo(e.target.value)}
                placeholder="e.g. D-2605-S-01"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">To Article No</label>
              <input
                type="text"
                value={toArticleNo}
                onChange={(e) => setToArticleNo(e.target.value)}
                placeholder="Alternative/Pair Ref"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">WhatsApp No</label>
              <input
                type="text"
                value={whatsappNo}
                onChange={(e) => setWhatsappNo(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Client Name"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Customer Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Shipping/Billing complete address (including City, State, PIN Code)"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold whitespace-pre-line"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider">II. Product Configuration &amp; Specs</h2>
              <button
                type="button"
                onClick={() => {
                  const newItem: AgreementItem = {
                    id: `item_${Math.random().toString(36).substring(2, 9)}`,
                    category: 'Door Frames',
                    subCategory: 'Set',
                    size: '6ft',
                    customSize: '',
                    designType: 'Standard',
                    material: 'Plywood',
                    finish: 'hand polish',
                    colorShade: 'Walnut',
                    specialNotes: '',
                    qty: 1,
                    quotedRate: 0,
                    cushion: 0,
                    discount: 0,
                    hardware: 0,
                    productName: 'Door Frames › Set (6ft)',
                    itemDescription: 'Structure: Plywood. Finish: hand polish. Color: Walnut.',
                  };
                  setItems((prev) => [...prev, newItem]);
                  setTimeout(() => loadItemToForm(items.length), 60);
                }}
                className="px-2.5 py-1 bg-[#593622]/10 hover:bg-[#593622]/20 text-[#593622] rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 transition"
              >
                <Plus size={12} />
                Add Another Product
              </button>
            </div>

            {/* List of tabs for each item */}
            <div className="flex flex-wrap gap-2 mb-4">
              {items.map((itm, idx) => (
                <div
                  key={itm.id || idx}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    idx === activeItemIndex
                      ? 'bg-[#593622] text-white border-[#593622] shadow-sm'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => loadItemToForm(idx)}
                    className="text-left font-semibold truncate max-w-[140px]"
                    title={itm.productName}
                  >
                    {idx + 1}. {itm.category} ({itm.qty}x)
                  </button>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextItems = items.filter((_, i) => i !== idx);
                        setItems(nextItems);
                        const nextIdx = Math.max(0, idx - 1);
                        setActiveItemIndex(nextIdx);
                        setTimeout(() => loadItemToForm(nextIdx), 60);
                      }}
                      className={`p-0.5 rounded-full hover:bg-black/10 transition ${
                        idx === activeItemIndex ? 'text-white/85 hover:text-white' : 'text-stone-400 hover:text-stone-600'
                      }`}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-12">
              <label className="block text-[10px] font-bold text-[#593622] uppercase tracking-wider mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Product Name"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-bold"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Beds, Door Frames"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Sub-Category</label>
              <input
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="e.g. Set, Premium Bed"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Size</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              >
                <option value="3ft">3ft (Single)</option>
                <option value="4ft">4ft (Medium)</option>
                <option value="6ft">6ft (King/Double)</option>
                <option value="Custom">Custom Size</option>
              </select>
            </div>

            {size === 'Custom' && (
              <div className="md:col-span-6">
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Custom Size Specifications</label>
                <input
                  type="text"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder="e.g. 78in x 72in x 18in"
                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
                />
              </div>
            )}

            <div className={size === 'Custom' ? 'md:col-span-6' : 'md:col-span-4'}>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Design Type</label>
              <select
                value={designType}
                onChange={(e) => setDesignType(e.target.value as 'Standard' | 'Custom')}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              >
                <option value="Standard">Standard Catalog Design</option>
                <option value="Custom">Bespoke / Custom Sketch</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Material Structure</label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              >
                <option value="Sagwan">Sagwan</option>
                <option value="Aakashi">Aakashi</option>
                <option value="Shivan">Shivan</option>
                <option value="Marine Ply">Marine Ply</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Finish Type</label>
              <select
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              >
                <option value="Hand Polish">Hand Polish</option>
                <option value="Machine Polish">Machine Polish</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Color / Shade</label>
              <input
                type="text"
                value={colorShade}
                onChange={(e) => setColorShade(e.target.value)}
                placeholder="e.g. Dark Walnut / Walnut Finish"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div className="md:col-span-4 text-xs">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div className="md:col-span-4 text-xs">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Quoted Rate Per Unit (₹)</label>
              <input
                type="number"
                value={quotedRate}
                onChange={(e) => {
                  setQuotedRate(Number(e.target.value));
                  setAmount(Number(e.target.value) * qty);
                }}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div className="md:col-span-12">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Special / Manufacturing Notes</label>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                rows={2}
                placeholder="Add special requests, internal parameters, or edge banding details..."
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div className="md:col-span-12">
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Auto-Generated Specifications (Printed)</label>
              <input
                type="text"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-100 border border-stone-200 text-stone-500 rounded-lg text-xs focus:outline-none focus:ring-0 font-mono"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider border-b pb-2">III. Rates, Extras &amp; Calculations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Cushion Cost (₹)</label>
              <input
                type="number"
                value={cushion}
                onChange={(e) => setCushion(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Hardware Additions (₹)</label>
              <input
                type="number"
                value={hardware}
                onChange={(e) => setHardware(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Discount Given (₹)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold text-rose-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-1">Computed Final Rate (₹)</label>
              <div className="w-full px-2.5 py-1.5 bg-stone-100 border border-stone-200 rounded-lg text-xs text-[#593622] font-black">
                ₹{finalRate.toLocaleString()}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Packing &amp; Forwarding (₹)</label>
              <input
                type="number"
                value={packingForwarding}
                onChange={(e) => setPackingForwarding(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Transportation Charges (₹)</label>
              <input
                type="number"
                value={transportation}
                onChange={(e) => setTransportation(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Advance Received (₹)</label>
              <input
                type="number"
                value={advance}
                onChange={(e) => setAdvance(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-green-50/55 border border-green-250 focus:border-green-600 rounded-lg text-xs focus:outline-none focus:ring-0 text-green-800 font-black"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-1">Computed Balance (₹)</label>
              <div className="w-full px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-black">
                ₹{balance.toLocaleString()}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              >
                <option value="CASH">CASH</option>
                <option value="BANK">BANK TRANSFER</option>
                <option value="UPI">UPI / GPAY</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Polish Shade</label>
              <input
                type="text"
                value={polishShade}
                onChange={(e) => setPolishShade(e.target.value)}
                placeholder="e.g. Natural Lacquer"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Type of Polish</label>
              <select
                value={typeOfPolish}
                onChange={(e) => setTypeOfPolish(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              >
                <option value="HAND">HAND POLISH</option>
                <option value="MACHINE">MACHINE POLISH</option>
              </select>
            </div>
          </div>

          {/* Gorgeous highlighted Totals card section */}
          <div className="bg-gradient-to-r from-stone-50 to-stone-100 border border-stone-200/80 rounded-xl p-4 mt-2">
            <span className="bg-[#593622]/10 text-[#593622] px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase block w-max mb-3">
              Summary of Accounts &amp; Totals
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-stone-150 rounded-xl p-3.5 shadow-xs transition hover:border-[#593622]/30">
                <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Total Invoiced</span>
                <span className="text-xl font-black text-stone-900">₹{totalInvoiced.toLocaleString()}</span>
                <span className="block text-[9px] text-stone-400 mt-1 font-mono">Formula: (Final Rate × Qty) + Extras</span>
              </div>

              <div className="bg-white border border-stone-150 rounded-xl p-3.5 shadow-xs transition hover:border-emerald-500/30">
                <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Total Advance Paid</span>
                <span className="text-xl font-black text-emerald-600">₹{totalAdvancePaid.toLocaleString()}</span>
                <span className="block text-[9px] text-stone-400 mt-1 font-mono">Paid advance amount received</span>
              </div>

              <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3.5 shadow-xs transition hover:border-[#593622]/50">
                <span className="block text-[10px] font-bold text-[#593622] uppercase tracking-wider mb-1">Outstanding Balance</span>
                <span className="text-xl font-black text-[#593622]">₹{outstandingBalance.toLocaleString()}</span>
                <span className="block text-[9px] text-amber-700/80 mt-1 font-mono">Net remaining due for dispatch</span>
              </div>
            </div>
          </div>

          {/* Section IV: Reference Drawings & Images */}
          <div className="border-t border-stone-200 pt-5 space-y-4">
            <div>
              <span className="bg-amber-600/10 text-amber-850 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase block w-max mb-1.5">Custom reference drawings</span>
              <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider border-b pb-2">IV. Reference Drawings &amp; Blueprints</h2>
            </div>

            <p className="text-stone-500 text-xs leading-relaxed">
              Upload client-approved furniture sketches, material catalogs, or dynamic reference blueprints. These images will render perfectly on page 3 of the printed agreement.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local File Upload Picker */}
              <div className="border-2 border-dashed border-stone-200 hover:border-[#593622] rounded-xl p-4 flex flex-col items-center justify-center text-center transition cursor-pointer relative bg-stone-50/50 min-h-[100px]">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleLocalFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadCloud size={28} className="text-stone-400 mb-1.5" />
                <span className="text-[11px] font-black text-stone-850 uppercase tracking-wider block">Upload Files</span>
                <span className="text-[9px] text-stone-400 block mt-0.5">Supports PNG, JPG, GIF (Max 5MB)</span>
              </div>

              {/* URL Import */}
              <div className="border border-stone-200 rounded-xl p-4 flex flex-col justify-between bg-stone-50/30 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider block mb-1">Import from URL</span>
                  <input
                    type="url"
                    value={imgUrlInput}
                    onChange={(e) => setImgUrlInput(e.target.value)}
                    placeholder="https://example.com/furniture-photo.jpg"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-1.5 bg-[#593622] hover:bg-[#402414] text-white text-[11px] font-bold uppercase tracking-wider rounded-lg self-end"
                >
                  Add URL Image
                </button>
              </div>
            </div>

            {/* Uploaded Reference Images grid */}
            {refImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 border border-stone-150 p-2.5 rounded-xl bg-stone-50/50">
                {refImages.map((img) => (
                  <div key={img.id} className="relative group border border-stone-200 rounded-lg overflow-hidden aspect-square bg-white flex items-center justify-center">
                    <img src={img.url} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-rose-700 shadow"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section V: Customer WhatsApp & PDF Transmission Flow */}
          <div className="border-t border-stone-200 pt-5 space-y-4">
            <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              V. Customer WhatsApp &amp; PDF Transmission Flow
            </h2>
            
            <p className="text-stone-500 text-xs leading-relaxed">
              To send this agreement directly to the customer's WhatsApp in professional PDF format, follow these quick steps:
            </p>

            {/* Gorgeous Interactive Step Guides */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white font-mono text-[10px] flex items-center justify-center font-bold">1</span>
                  <span className="text-[11px] font-black text-stone-900 uppercase tracking-wider">Save Agreement PDF</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-normal">
                  Click the brown <strong>"Print Agreement Papers"</strong> button above or in the preview panel, and choose <strong>"Save as PDF"</strong> in your print destination.
                </p>
              </div>

              <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#593622] text-white font-mono text-[10px] flex items-center justify-center font-bold">2</span>
                  <span className="text-[11px] font-black text-[#593622] uppercase tracking-wider">Start WhatsApp Chat</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-normal">
                  Click the green <strong>"Send WhatsApp Specification"</strong> button below. It will open active chat with <strong>{whatsappNo || 'the saved customer WP details'}</strong> with pre-filled summary.
                </p>
              </div>

              <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">3</span>
                  <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">Attach Saved PDF</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-normal">
                  Once the WhatsApp interface opens, simply <strong>drag and drop or attach the saved PDF agreement</strong> file directly into the message box!
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
              <div className="w-full sm:w-auto">
                <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1">Target WhatsApp Recipient</span>
                <div className="text-sm font-extrabold text-stone-850 flex items-center gap-1.5">
                  <span className="bg-emerald-150 text-emerald-800 px-2.5 py-1 rounded text-xs font-mono font-bold border border-emerald-250/20">
                    {whatsappNo ? `${whatsappNo}` : 'No phone number set'}
                  </span>
                  {customerName && <span className="text-stone-550 text-xs font-normal">({customerName})</span>}
                </div>
              </div>

              {whatsappNo ? (
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl inline-flex items-center justify-center gap-2 shadow-sm transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-4.5 h-4.5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966a9.9 9.9 0 00-6.98-2.879c-5.443 0-9.87 4.37-9.874 9.8.001 1.745.467 3.45 1.348 4.96l-.993 3.626 3.72-.942zm11.104-3.56c-.301-.15-1.78-.878-2.056-.978-.275-.1-.476-.15-.675.15-.199.3-.77.978-.944 1.178-.173.2-.347.225-.648.075-.3-.15-1.266-.467-2.41-1.488-.89-.794-1.49-1.774-1.664-2.074-.174-.3-.019-.462.13-.611.135-.134.301-.35.452-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.589-.493-.51-.675-.52-.174-.01-.374-.012-.574-.012s-.525.075-.8.375c-.275.3-1.05 1.025-1.05 2.5s1.075 2.9 1.225 3.1c.15.2 2.11 3.224 5.112 4.521.714.31 1.272.495 1.708.634.717.228 1.37.196 1.885.12.574-.085 1.78-.727 2.03-1.43.25-.702.25-1.303.175-1.43-.075-.125-.275-.2-.575-.35z"/>
                  </svg>
                  Send WhatsApp Specification
                </a>
              ) : (
                <button
                  disabled
                  className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 text-stone-400 font-bold text-xs uppercase tracking-wider rounded-xl inline-flex items-center justify-center gap-2 cursor-not-allowed border border-stone-200"
                >
                  <AlertCircle size={14} className="text-stone-400" />
                  No Active Number
                </button>
              )}
            </div>
          </div>

          {/* Section VI: Send to Workshop */}
          <div className="border-t-2 border-[#593622]/25 pt-5 space-y-4 bg-gradient-to-br from-amber-50/30 to-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <span className="bg-[#593622]/10 text-[#593622] px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase block w-max mb-1.5">Launch Manufacturing Line</span>
              <h2 className="text-sm font-black text-[#593622] uppercase tracking-wider font-display">VI. Workshop Delegation</h2>
            </div>

            <p className="text-stone-500 text-xs leading-relaxed">
              Ready to begin carpentry production? Clicking the button below validates all product dimensions, saves this draft state, and directs you immediately to the <strong>Work Order Assignment step</strong>, skipping manual repetitive input screens!
            </p>

            <button
              type="button"
              onClick={handleSendToWorkOrder}
              className="w-full py-3 bg-[#593622] hover:bg-[#402414] text-amber-300 font-extrabold text-xs uppercase tracking-widest rounded-xl inline-flex items-center justify-center gap-2 shadow-md transition hover:scale-[1.01] active:scale-[0.99] border-2 border-amber-500/20"
            >
              <HardHat size={16} className="stroke-[2.5]" />
              Send to Work Order Flow
            </button>
          </div>

        </div>

        {/* DYNAMIC AGREEMENT PAGES PREVIEW PANEL (SCREEN VIEW CONTAINER WITH LIVE RENDER) */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-stone-700">
            <Sparkles size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block text-amber-900 font-bold">Print Preview Mode Ready!</strong>
              <span>Any modifications made on the left form update the agreement pages in real-time. Use the button below to execute printing to PDF or standard physical paper.</span>
              <button
                onClick={handlePrint}
                className="mt-2 px-3 py-1 bg-[#593622] text-white font-bold rounded-lg hover:bg-[#402414] text-[10px] inline-flex items-center gap-1 shadow-sm transition"
              >
                <Printer size={10} />
                Trigger Print Mode
              </button>
            </div>
          </div>

          <div className="border border-stone-300 rounded-2xl bg-[#eee]/65 p-4 space-y-4 max-h-[85vh] overflow-y-auto shadow-inner">
            <span className="text-[10px] font-bold text-stone-450 uppercase tracking-wider block text-center">Live Preview of Document Pages (A4 Proportion)</span>
            
            {/* MINIFIED PRODUCT PAGES (PAGE 1, 1.1, etc.) */}
            {itemPages.map((pageItems, pageIdx) => {
              const isFirstPage = pageIdx === 0;
              const isLastPage = pageIdx === itemPages.length - 1;

              return (
                <div
                  key={`preview_specs_page_${pageIdx}`}
                  className="bg-white border rounded shadow-xs p-6 origin-top scale-100 transition-all text-[11px] leading-snug font-mono text-black select-none max-w-full"
                >
                  <div className="border-2 border-black p-4 space-y-4 min-h-[500px] flex flex-col justify-between">
                    <div>
                      {/* Header */}
                      <div className="text-center font-bold tracking-wider text-sm border-b pb-2 select-none uppercase">
                        {language === 'mr' 
                          ? `भिसेज् वुड वर्कशॉप - सविस्तर ऑर्डर फॉर्म ${pageIdx > 0 ? '(चालू)' : ''}` 
                          : `BHISE'Z WORKSHOP - DETAIL ORDER FORM ${pageIdx > 0 ? '(CONT.)' : ''}`}
                      </div>

                      {/* Metadata */}
                      {isFirstPage && (
                        <div className="grid grid-cols-2 gap-2 text-[10px] mt-2 border-b pb-2">
                          <div><strong>{language === 'mr' ? 'ऑर्डरची तारीख:' : 'ORDER DATE:'}</strong> {orderDate ? formatToDDMMYYYY(orderDate) : '_________________'}</div>
                          <div><strong>{language === 'mr' ? 'वितरणाची तारीख:' : 'DELIVERY DATE:'}</strong> {deliveryDate ? formatToDDMMYYYY(deliveryDate) : '_________________'}</div>
                          
                          <div className="col-span-2 grid grid-cols-2 gap-2 border-y border-dashed border-stone-200 py-1 my-0.5">
                            <div>
                              <strong>{language === 'mr' ? 'ऑर्डर क्र.:' : 'ORDER NO:'}</strong>
                              {orderNo && orderNo.includes('&') ? (
                                <ul className="list-disc pl-3 mt-0.5 space-y-0.5 text-[9px]">
                                  {orderNo.split(/\s*&\s*/).map((no, idx) => (
                                    <li key={idx} className="font-bold">{no}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="font-bold"> {orderNo || '_________________'}</span>
                              )}
                            </div>
                            <div>
                              <strong>{language === 'mr' ? 'आर्टिकल क्र.:' : 'ARTICLE NO:'}</strong>
                              {articleNo && articleNo.includes('&') ? (
                                <ul className="list-disc pl-3 mt-0.5 space-y-0.5 text-[9px]">
                                  {articleNo.split(/\s*&\s*/).map((no, idx) => (
                                    <li key={idx} className="font-bold">{no}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="font-bold"> {articleNo || '_________________'}</span>
                              )}
                            </div>
                          </div>

                          <div><strong>{language === 'mr' ? 'पर्यायी आर्टिकल क्र.:' : 'TO ARTICLE NO:'}</strong> {toArticleNo || '_________________'}</div>
                          <div><strong>{language === 'mr' ? 'व्हॉट्सॲप क्र.:' : 'WHATSAPP NO:'}</strong> {whatsappNo || '_________________'}</div>
                          <div className="col-span-2"><strong>{language === 'mr' ? 'ग्राहकाचे नाव:' : 'CUSTOMER NAME:'}</strong> {customerName || '_________________'}</div>
                          <div className="col-span-2 whitespace-pre-line"><strong>{language === 'mr' ? 'पत्ता:' : 'ADDRESS:'}</strong> {address || '__________________________________________________'}</div>
                        </div>
                      )}

                      {/* Items */}
                      <div className="border-t border-b border-black py-2 my-2 space-y-2">
                        <div className="font-bold underline uppercase text-[10px]">
                          {language === 'mr' 
                            ? `उत्पादनांचा तपशील (भाग ${pageIdx + 1}):` 
                            : `Products details (Part ${pageIdx + 1}):`}
                        </div>
                        <div className="space-y-2">
                          {pageItems.map((item, idx) => {
                            const itemFinalRate = Math.max(0, Number(item.quotedRate) + Number(item.cushion) + Number(item.hardware) - Number(item.discount));
                            return (
                              <div key={item.id || idx} className="border-b border-stone-100 pb-1.5 last:border-0 last:pb-0 text-[10px]">
                                <div className="font-bold text-stone-900">{item.productName}</div>
                                <div className="mt-1 pl-2 border-l-2 border-[#593622] space-y-0.5 text-[9px] text-stone-600 font-mono">
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                    <div><strong>{language === 'mr' ? 'आकार:' : 'Size:'}</strong> {item.size === 'Custom' ? `${item.customSize || 'Custom'}` : item.size}</div>
                                    <div><strong>{language === 'mr' ? 'डिझाईन:' : 'Design:'}</strong> {item.designType}</div>
                                    <div><strong>{language === 'mr' ? 'मटेरिअल:' : 'Material:'}</strong> {item.material}</div>
                                    <div><strong>{language === 'mr' ? 'फिनिश:' : 'Finish:'}</strong> {item.finish}</div>
                                    <div className="col-span-2"><strong>{language === 'mr' ? 'रंग/शेड:' : 'Color/Shade:'}</strong> {item.colorShade}</div>
                                    <div><strong>{language === 'mr' ? 'प्रमाण:' : 'Qty:'}</strong> {item.qty}</div>
                                    <div><strong>{language === 'mr' ? 'कोटेड दर:' : 'Quoted Rate:'}</strong> ₹{Number(item.quotedRate || 0).toLocaleString()}</div>
                                  </div>
                                  {item.specialNotes && (
                                    <div className="mt-1 pl-1 bg-stone-50 border-l border-stone-300 text-stone-500 text-[8.5px] italic">
                                      <strong>{language === 'mr' ? 'विशेष नोंद:' : 'Mfg Notes:'}</strong> {item.specialNotes}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-4 mt-1 text-[9px]">
                                  <div><strong>{language === 'mr' ? 'नग:' : 'QTY:'}</strong> {item.qty}</div>
                                  <div><strong>{language === 'mr' ? 'अंतिम दर:' : 'FINAL RATE:'}</strong> ₹{itemFinalRate.toLocaleString()}</div>
                                  <div><strong>{language === 'mr' ? 'रक्कम:' : 'AMOUNT:'}</strong> ₹{(itemFinalRate * item.qty).toLocaleString()}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Financial details & polish specs on the last page */}
                      {isLastPage && (
                        <>
                          <div className="grid grid-cols-2 gap-1.5 text-[9px] border-b pb-2">
                            <div><strong>{language === 'mr' ? 'उत्पादने एकूण उप-बेरीज:' : 'PRODUCTS SUBTOTAL:'}</strong> ₹{itemsSubtotal.toLocaleString()}</div>
                            <div><strong>{language === 'mr' ? 'पॅकिंग व फॉरवर्डिंग:' : 'PACKING & FORWARDING:'}</strong> ₹{packingForwarding.toLocaleString()}</div>
                            <div><strong>{language === 'mr' ? 'वाहतूक खर्च:' : 'TRANSPORTATION:'}</strong> ₹{transportation.toLocaleString()}</div>
                            <div><strong>{language === 'mr' ? 'ऍडव्हान्स पेमेंट:' : 'ADVANCE:'}</strong> ₹{advance.toLocaleString()}</div>
                            <div className="col-span-2 font-bold flex justify-between border-t border-dashed border-stone-200 pt-1">
                              <span>{language === 'mr' ? 'पैसे देण्याची पद्धत:' : 'PAYMENT MODE:'}</span>
                              <span className="font-bold text-stone-900">{paymentMode}</span>
                            </div>
                            <div className="font-bold col-span-2 text-[9.5px] border-t border-dashed border-stone-300 pt-1 flex justify-between">
                              <span>{language === 'mr' ? 'एकूण बीजक रक्कम:' : 'TOTAL INVOICED:'}</span>
                              <span>₹{totalInvoiced.toLocaleString()}</span>
                            </div>
                            <div className="font-bold col-span-2 text-[9.5px] flex justify-between">
                              <span>{language === 'mr' ? 'एकूण आगाऊ रक्कम:' : 'TOTAL ADVANCE PAID:'}</span>
                              <span>₹{totalAdvancePaid.toLocaleString()}</span>
                            </div>
                            <div className="font-bold text-amber-900 col-span-2 text-xs border-t border-stone-400 pt-1 flex justify-between">
                              <span>{language === 'mr' ? 'उर्वरित शिल्लक रक्कम:' : 'OUTSTANDING BALANCE:'}</span>
                              <span>₹{outstandingBalance.toLocaleString()}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Signatures */}
                    {isLastPage && (
                      <div className="grid grid-cols-2 gap-8 text-center pt-4 border-t border-black">
                        <div>_________________<br/><span className="text-[8px] uppercase tracking-wider">{language === 'mr' ? 'व्यवस्थापकाची स्वाक्षरी' : 'MANAGER SIGN'}</span></div>
                        <div>_________________<br/><span className="text-[8px] uppercase tracking-wider">{language === 'mr' ? 'ग्राहकाची स्वाक्षरी' : 'CUSTOMER SIGN'}</span></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* MINIFIED PAGE 2 (TERMS & CONDITIONS) */}
            <div className="bg-white border rounded shadow-xs p-6 origin-top scale-100 transition-all text-[9.5px] leading-normal font-sans text-stone-850 select-none max-w-full">
              <div className="border-2 border-black p-4 space-y-2">
                <div className="text-center font-extrabold tracking-wider border-b pb-1 flex justify-between items-center text-stone-900">
                  <span>{language === 'mr' ? 'पान २' : 'PAGE 2'}</span>
                  <span>{language === 'mr' ? 'नियम आणि अटी' : 'TERMS AND CONDITIONS'}</span>
                  <span>{language === 'mr' ? 'भिसेज् वर्कशॉप' : "BHISE'Z WORKSHOP"}</span>
                </div>
                <ol className="list-decimal list-outside pl-4 space-y-1 text-justify text-stone-700">
                  <li>
                    <strong className="text-stone-900 uppercase text-[8.5px] block">{language === 'mr' ? '१. ॲडव्हान्स पेमेंटची आवश्यकता :' : '1. Advance Payment Requirement:'}</strong>
                    {language === 'mr' ? (
                      <>काम सुरू करण्यापूर्वी मी एकूण ऑर्डरच्या खर्चाच्या <span className="underline font-bold">₹{advance.toLocaleString() || '_______'}</span> चे ॲडव्हान्स पेमेंट देण्यास सहमत आहे. ॲडव्हान्स पेमेंटची रक्कम <span className="underline font-bold">₹{advance.toLocaleString() || '_______________________'}</span> आहे.</>
                    ) : (
                      <>I agree to pay an advance payment amounting <span className="underline font-bold">₹{advance.toLocaleString() || '_______'}</span> of the total order cost prior to the commencement of work. The advance payment amount is <span className="underline font-bold">₹{advance.toLocaleString() || '_______________________'}</span>.</>
                    )}
                  </li>
                  <li>
                    <strong className="text-stone-900 uppercase text-[8.5px] block">{language === 'mr' ? '२. पेमेंट वेळापत्रक (पेमेंट शेड्युल) :' : '2. Payment Schedule:'}</strong>
                    {language === 'mr' ? (
                      <>करार किंवा करारावर स्वाक्षरी केल्यावर लगेचच ॲडव्हान्स पेमेंट भरणे आवश्यक आहे. पुढील देयके मुख्य करारामध्ये नमूद केलेल्या पेमेंट वेळापत्रकानुसार केली जातील. माल पाठवण्यापूर्वी पूर्ण पेमेंट मिळणे अनिवार्य आहे.</>
                    ) : (
                      <>The advance payment is due immediately upon signing the contract or agreement. Subsequent payments will be made as per the agreed payment schedule outlined in the main contract. Full payment must be received before the dispatch of goods.</>
                    )}
                  </li>
                  <li>
                    <strong className="text-stone-900 uppercase text-[8.5px] block">{language === 'mr' ? '३. रिफंड न मिळण्याबाबतची अट :' : '3. Non-Refundable Clause:'}</strong>
                    {language === 'mr' ? (
                      <>सर्व्हिस प्रोव्हायडरकडून कराराचा भंग झाल्याशिवाय ॲडव्हान्स पेमेंट परत केले जाणार नाही. २४ तासांनंतर ॲडव्हान्स पेमेंट कोणत्याही परिस्थितीत परत केले जाणार नाही.</>
                    ) : (
                      <>The advance payment is non-refundable except in the event of a breach of contract by the Service Provider. Advance payment will not be refunded after 24 hours.</>
                    )}
                  </li>
                  <li>
                    <strong className="text-stone-900 uppercase text-[8.5px] block">{language === 'mr' ? '४. काम सुरू करणे :' : '4. Service Commencement:'}</strong>
                    {language === 'mr' ? (
                      <>ॲडव्हान्स पेमेंट आणि तुमच्या आवश्यकतेबद्दल आवश्यक ती कागदपत्रे किंवा माहिती मिळाल्यानंतरच काम सुरू होईल. ॲडव्हान्स पेमेंटला विलंब झाल्यास उत्पादन सुरू होण्यास तोच समान विलंब होऊ शकतो.</>
                    ) : (
                      <>Work will commence upon receipt of the advance payment and any required documentation or information from you about your requirement. Any delay in the advance payment may result in a corresponding delay in the commencement of manufacturing.</>
                    )}
                  </li>
                  <li>
                    <strong className="text-stone-900 uppercase text-[8.5px] block">{language === 'mr' ? '५. कामाची व्याप्ती :' : '5. Scope of Work:'}</strong>
                    {language === 'mr' ? (
                      <>मूळ ऑर्डरमधील कोणतेही अतिरिक्त काम किंवा बदलांसाठी अतिरिक्त शुल्क लागू होईल.</>
                    ) : (
                      <>Any additional work or changes to the initial order will be subject to additional charges.</>
                    )}
                  </li>
                  <li>
                    <strong className="text-stone-900 uppercase text-[8.5px] block">{language === 'mr' ? '६. डिलिव्हरी (वितरण) :' : '6. Delivery:'}</strong>
                    {language === 'mr' ? (
                      <>डिलिव्हरीची अचूक माहिती देण्याची जबाबदारी माझी आहे. माझ्याकडून चुकीची किंवा अपूर्ण माहिती दिल्यामुळे डिलिव्हरी यशस्वी न झाल्यास विक्रेता जबाबदार राहणार नाही. डिलिव्हरीची तारीख २-३ दिवसांनी बदलू शकते.</>
                    ) : (
                      <>I am responsible for providing accurate delivery information. The Seller is not liable for delivery failures due to incorrect or incomplete information provided by me. The delivery date may vary by 2-3 days.</>
                    )}
                  </li>
                  <li>
                    <strong className="text-stone-900 uppercase text-[8.5px] block">{language === 'mr' ? '७. वस्तू परत मिळणे आणि रिफंड :' : '7. Returns and Refunds:'}</strong>
                    {language === 'mr' ? (
                      <>डिलिव्हरी मिळाल्यापासून २ दिवसांच्या आत मी कोणत्याही सदोष किंवा चुकीच्या वस्तूची माहिती विक्रेत्याला देईन. वस्तू सदोष किंवा चुकीची असल्याशिवाय वस्तू परत करण्याच्या वाहतूक खर्चासाठी मी स्वतः जबाबदार असेन.</>
                    ) : (
                      <>I will notify the Seller of any defective or incorrect items within 2 days of delivery. I am responsible for return shipping costs unless the item is defective or incorrect.</>
                    )}
                  </li>
                  <li>
                    <strong className="text-stone-900 uppercase text-[8.5px] block">{language === 'mr' ? '८. ऑर्डर रद्द करणे :' : '8. Order Cancellation:'}</strong>
                    {language === 'mr' ? (
                      <>खरेदीदार ऑर्डर दिल्यानंतर २४ तासांच्या आत विक्रेत्याशी संपर्क साधून आपली ऑर्डर रद्द करू शकतात. गैरवापर, दुर्लक्ष किंवा अनधिकृत दुरुस्तीमुळे वस्तू खराब झाल्यास विक्रेता जबाबदार नाही.</>
                    ) : (
                      <>The Buyer may cancel their order within 24 hours of placing it by contacting the Seller. The Seller is not liable if the product is damaged due to misuse, neglect, or unauthorized repair.</>
                    )}
                  </li>
                  <li>
                    <strong className="text-stone-900 uppercase text-[8.5px] block">{language === 'mr' ? '९. अंशतः डिलिव्हरी (पार्ट डिलिव्हरी) :' : '9. Part Delivery:'}</strong>
                    {language === 'mr' ? (
                      <>अंशतः डिलिव्हरीच्या बाबतीत (पार्ट डिलिव्हरी), मी डिलिव्हरी चार्जेस तसेच इन्स्टॉलेशन चार्जेस भरण्यास सहमत आहे. ज्या उत्पादनांची डिलिव्हरी होणार आहे त्यांची पूर्ण रक्कम आणि भविष्यात डिलीव्हर होणाऱ्या उर्वरित उत्पादनांचे ४०% ॲडव्हान्स देण्यास मी सहमत आहे.</>
                    ) : (
                      <>In case of part delivery, I agree to pay the delivery charges as well as installation charges. I agree to pay the full amount of the products which are to be delivered and 40% Advance of the remaining products which will be delivered in future.</>
                    )}
                  </li>
                  <li>
                    <strong className="text-stone-900 uppercase text-[8.5px] block">{language === 'mr' ? '१०. नियमांची स्वीकृती :' : '10. Acceptance of Terms:'}</strong>
                    {language === 'mr' ? (
                      <>ॲडव्हान्स पेमेंट करून, मी कबूल करतो की मी हे नियम आणि अटी वाचल्या आहेत, समजून घेतल्या आहेत आणि मी त्यांच्याशी सहमत आहे.</>
                    ) : (
                      <>By making the advance payment, I acknowledge that I have read, understood, and agree to these terms and conditions.</>
                    )}
                  </li>
                </ol>
                <div className="pt-4 flex justify-between text-center font-bold">
                  <div>_________________<br/><span className="text-[8px] uppercase tracking-wider">{language === 'mr' ? 'व्यवस्थापकाची स्वाक्षरी' : 'Manager Signature'}</span></div>
                  <div>_________________<br/><span className="text-[8px] uppercase tracking-wider">{language === 'mr' ? 'ग्राहकाची स्वाक्षरी' : 'Customer Signature'}</span></div>
                </div>
              </div>
            </div>

            {/* MINIFIED PAGE 3+ FOR REFERENCE DRAWINGS & BLUEPRINTS */}
            {imagePages.map((pageImgs, pageIdx) => (
              <div
                key={`preview_drawings_page_${pageIdx}`}
                className="bg-white border rounded shadow-xs p-6 origin-top scale-100 transition-all text-[10px] leading-normal font-sans text-stone-850 select-none max-w-full"
              >
                <div className="border-2 border-black p-4 space-y-4 min-h-[450px] flex flex-col justify-between">
                  <div>
                    <div className="text-center font-extrabold tracking-wider border-b pb-1 flex justify-between items-center text-stone-900 mb-4 text-[11px]">
                      <span>{language === 'mr' ? `पान ${3 + pageIdx}` : `PAGE ${3 + pageIdx}`}</span>
                      <span>{language === 'mr' ? 'संदर्भ रेखाचित्रे आणि ब्ल्यूप्रिंट्स' : 'REFERENCE DRAWINGS & BLUEPRINTS'}</span>
                      <span>{language === 'mr' ? 'भिसेज् वर्कशॉप' : "BHISE'Z WORKSHOP"}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {pageImgs.map((img) => (
                        <div
                          key={img.id}
                          className="border border-stone-300 rounded-lg overflow-hidden aspect-video bg-stone-50 flex items-center justify-center p-1"
                        >
                          <img
                            src={img.url}
                            className="max-h-full max-w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-between text-center font-bold border-t border-stone-200">
                    <div>_________________<br/><span className="text-[8px] uppercase tracking-wider">{language === 'mr' ? 'व्यवस्थापकाची स्वाक्षरी' : 'Manager Signature'}</span></div>
                    <div>_________________<br/><span className="text-[8px] uppercase tracking-wider">{language === 'mr' ? 'ग्राहकाची स्वाक्षरी' : 'Customer Signature'}</span></div>
                  </div>
                </div>
              </div>
            ))}

          </div>
        </div>

      </div>

      {/* PRINT-ONLY EMBEDDED AREA (Forces visibility in system window print and structures into clean pages) */}
      <div className="hidden print:block print-wrapper-flow bg-white text-black font-sans p-0 m-0">
        
        {/* SPECIFICATION PAGES (PAGE 1, 1.1, etc.) */}
        {itemPages.map((pageItems, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === itemPages.length - 1;
          
          return (
            <div
              key={`print_specs_page_${pageIdx}`}
              className="w-[100%] h-screen min-h-screen p-8 bg-white border border-transparent box-border flex flex-col justify-between print-page"
              style={pageIdx > 0 ? { pageBreakBefore: 'always' } : {}}
            >
              <div>
                {/* Header - Only on the very first page, or a minified header on subsequent pages */}
                {isFirstPage ? (
                  <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-4">
                    <div>
                      <h1 className="text-2xl font-black tracking-tighter uppercase font-sans text-stone-950">
                        {language === 'mr' ? 'भिसेज् वुड वर्कशॉप' : "BHISE'Z WOOD WORKSHOP"}
                      </h1>
                      <p className="text-[9px] uppercase tracking-widest font-mono text-stone-600">
                        {language === 'mr' ? 'उत्कृष्ट फर्निचर उत्पादक आणि कारागीर' : 'Elite Furniture Manufacturers & Custom Wood Crafters'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black border border-black px-2 py-1 uppercase tracking-wide">
                        {language === 'mr' ? 'सविस्तर ऑर्डर फॉर्म' : 'Detail Order Form'}
                      </span>
                      <p className="text-[9px] mt-1 text-stone-600 font-mono">
                        {language === 'mr' ? 'संदर्भ क्र.:' : 'Invoice Ref:'} #{orderNo || 'MANUAL'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center border-b border-black pb-1 mb-4 text-[10px] font-mono">
                    <span className="font-bold">
                      {language === 'mr' ? 'भिसेज् वुड वर्कशॉप - सविस्तर ऑर्डर फॉर्म (चालू)' : "BHISE'Z WOOD WORKSHOP - DETAIL ORDER FORM (CONT.)"}
                    </span>
                    <span>
                      {language === 'mr' ? `पान १.${pageIdx}` : `Page 1.${pageIdx}`}
                    </span>
                  </div>
                )}

                {/* Metadata - Only on the first page */}
                {isFirstPage && (
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono border border-black p-3 rounded mb-4">
                    <div className="space-y-1">
                      <div><strong>{language === 'mr' ? 'ऑर्डरची तारीख:' : 'ORDER DATE:'}</strong> {orderDate ? formatToDDMMYYYY(orderDate) : '_______________________'}</div>
                      <div><strong>{language === 'mr' ? 'वितरणाची तारीख:' : 'DELIVERY DATE:'}</strong> {deliveryDate ? formatToDDMMYYYY(deliveryDate) : '_______________________'}</div>
                      
                      <div className="border-t border-dashed border-stone-300 pt-1">
                        <strong>{language === 'mr' ? 'ऑर्डर क्रमांक:' : 'ORDER NO:'}</strong>
                        {orderNo && orderNo.includes('&') ? (
                          <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                            {orderNo.split(/\s*&\s*/).map((no, idx) => (
                              <li key={idx} className="font-bold">{no}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="font-bold"> {orderNo || '_______________________'}</span>
                        )}
                      </div>

                      <div className="border-t border-dashed border-stone-300 pt-1">
                        <strong>{language === 'mr' ? 'आर्टिकल क्रमांक:' : 'ARTICLE NO:'}</strong>
                        {articleNo && articleNo.includes('&') ? (
                          <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                            {articleNo.split(/\s*&\s*/).map((no, idx) => (
                              <li key={idx} className="font-bold">{no}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="font-bold"> {articleNo || '_______________________'}</span>
                        )}
                      </div>

                      <div className="border-t border-dashed border-stone-300 pt-1">
                        <strong>{language === 'mr' ? 'पर्यायी आर्टिकल क्र.:' : 'TO ARTICLE NO:'}</strong> {toArticleNo || '_______________________'}
                      </div>
                    </div>
                    <div className="space-y-1.5 border-l border-stone-300 pl-4">
                      <div><strong>{language === 'mr' ? 'ग्राहकाचे नाव:' : 'CUSTOMER NAME:'}</strong> {customerName || '_______________________'}</div>
                      <div><strong>{language === 'mr' ? 'व्हॉट्सॲप क्र.:' : 'WHATSAPP NO:'}</strong> {whatsappNo || '_______________________'}</div>
                      <div className="pt-1.5 border-t border-dashed border-stone-300">
                        <strong>{language === 'mr' ? 'पत्ता:' : 'ADDRESS:'}</strong> 
                        <span className="text-[11px] font-sans block mt-0.5 whitespace-pre-line">{address || '__________________________________________________'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items Table for this sub-page */}
                <div className="border border-black rounded p-3 mb-4">
                  <h2 className="text-[10px] font-black uppercase tracking-widest border-b pb-1 mb-2">
                    {language === 'mr' ? `वस्तूंचे तपशील (भाग ${pageIdx + 1})` : `Item Specifications (Part ${pageIdx + 1})`}
                  </h2>
                  <table className="w-full text-xs font-mono text-left">
                    <thead>
                      <tr className="border-b border-stone-400">
                        <th className="py-1">{language === 'mr' ? 'उत्पादनाचे नाव' : 'PRODUCT NAME'}</th>
                        <th className="py-1 text-center">{language === 'mr' ? 'नग' : 'QTY'}</th>
                        <th className="py-1 text-right">{language === 'mr' ? 'दर प्रति नग (₹)' : 'UNIT RATE (₹)'}</th>
                        <th className="py-1 text-right">{language === 'mr' ? 'एकूण रक्कम (₹)' : 'SUBTOTAL (₹)'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item, idx) => {
                        const itemFinalRate = Math.max(0, Number(item.quotedRate) + Number(item.cushion) + Number(item.hardware) - Number(item.discount));
                        const itemSubtotal = itemFinalRate * Number(item.qty);
                        return (
                          <React.Fragment key={item.id || idx}>
                            <tr className={idx > 0 ? 'border-t border-stone-250' : ''}>
                              <td className="py-1 font-bold text-stone-900">{item.productName}</td>
                              <td className="py-1 text-center">{item.qty}</td>
                              <td className="py-1 text-right">₹{itemFinalRate.toLocaleString()}</td>
                              <td className="py-1 text-right font-bold">₹{itemSubtotal.toLocaleString()}</td>
                            </tr>
                            <tr className="border-b border-stone-300">
                              <td colSpan={4} className="pb-1.5 pt-1 text-[9px] text-stone-750 leading-snug">
                                <strong className="block mb-1 text-stone-900 uppercase tracking-wider text-[8px]">{language === 'mr' ? 'सविस्तर वैशिष्ट्ये:' : 'DETAILED SPECIFICATIONS:'}</strong>
                                <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 pl-2 font-mono">
                                  <div>• <strong>{language === 'mr' ? 'आकार:' : 'Size:'}</strong> {item.size === 'Custom' ? `${item.customSize || 'Custom'}` : item.size}</div>
                                  <div>• <strong>{language === 'mr' ? 'डिझाईन:' : 'Design:'}</strong> {item.designType}</div>
                                  <div>• <strong>{language === 'mr' ? 'मटेरिअल:' : 'Material:'}</strong> {item.material}</div>
                                  <div>• <strong>{language === 'mr' ? 'फिनिश:' : 'Finish:'}</strong> {item.finish}</div>
                                  <div>• <strong>{language === 'mr' ? 'रंग/शेड:' : 'Color/Shade:'}</strong> {item.colorShade}</div>
                                  <div>• <strong>{language === 'mr' ? 'दर (₹):' : 'Unit Rate:'}</strong> ₹{Number(item.quotedRate || 0).toLocaleString()}</div>
                                  <div>• <strong>{language === 'mr' ? 'प्रमाण:' : 'Quantity:'}</strong> {item.qty}</div>
                                </div>
                                {item.specialNotes && (
                                  <div className="mt-1 pl-2 text-[8.5px] text-stone-600 font-sans italic">
                                    <strong>{language === 'mr' ? 'विशेष नोंद:' : 'Special/Mfg Notes:'}</strong> {item.specialNotes}
                                  </div>
                                )}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Financial and Signatures block - Only on the last page of specs */}
                {isLastPage && (
                  <>
                    {/* FINANCIAL CALCULATIONS SECTION */}
                    <div className="border border-black rounded p-3 mb-4">
                      <h2 className="text-[10px] font-black uppercase tracking-widest border-b pb-1 mb-1.5">
                        {language === 'mr' ? 'वित्तीय कपातीचा सविस्तर गोषवारा' : 'Detailed Financial Specification'}
                      </h2>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs font-mono">
                        <div className="flex justify-between border-b border-stone-200 pb-0.5">
                          <span>{language === 'mr' ? 'उत्पादने एकूण उप-बेरीज:' : 'PRODUCTS SUBTOTAL:'}</span>
                          <span>₹{itemsSubtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-200 pb-0.5 font-bold text-stone-900">
                          <span>{language === 'mr' ? 'एकूण बीजक रक्कम:' : 'TOTAL INVOICED AMOUNT:'}</span>
                          <span>₹{totalInvoiced.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-200 pb-0.5">
                          <span>{language === 'mr' ? 'पॅकिंग व फॉरवर्डिंग:' : 'PACKING / FORWARDING:'}</span>
                          <span>₹{packingForwarding.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-200 pb-0.5">
                          <span>{language === 'mr' ? '(-) ऍडव्हान्स पेमेंट:' : '(-) ADVANCE DEPOSITED:'}</span>
                          <span>₹{advance.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-200 pb-0.5">
                          <span>{language === 'mr' ? 'वाहतूक खर्च:' : 'TRANSPORTATION FEE:'}</span>
                          <span>₹{transportation.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-200 pb-0.5 font-bold text-emerald-800">
                          <span>{language === 'mr' ? 'एकूण आगाऊ रक्कम:' : 'TOTAL ADVANCE PAID:'}</span>
                          <span>₹{totalAdvancePaid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-200 pb-0.5 font-bold text-stone-900">
                          <span>{language === 'mr' ? 'पैसे देण्याची पद्धत:' : 'PAYMENT MODE:'}</span>
                          <span className="uppercase">{paymentMode}</span>
                        </div>
                        <div className="border-b border-stone-200 pb-0.5">
                          {/* Blank cell to balance grid */}
                        </div>
                        <div className="col-span-2 flex justify-between pt-1 font-black text-[#593622] text-sm border-t border-black uppercase mt-0.5">
                          <span>{language === 'mr' ? 'उर्वरित शिल्लक रक्कम:' : 'Outstanding Balance:'}</span>
                          <span>₹{outstandingBalance.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Signatures at the bottom of the last page */}
              {isLastPage && (
                <div className="grid grid-cols-2 gap-12 text-center text-xs font-mono border-t pt-4 mt-2">
                  <div className="space-y-8">
                    <span className="text-stone-450 block font-light">{language === 'mr' ? 'भिसेज् वर्कशॉप व्यवस्थापन' : "Bhise'z Workshop Management"}</span>
                    <div>
                      <div className="h-0.5 w-40 bg-black mx-auto" />
                      <span className="font-bold uppercase tracking-wider block mt-1 text-[10px]">
                        {language === 'mr' ? 'व्यवस्थापकाची स्वाक्षरी' : 'MANAGER SIGN'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <span className="text-stone-450 block font-light">{language === 'mr' ? 'ग्राहकाची सहमती स्वीकृती' : 'Client Confirmation Acceptance'}</span>
                    <div>
                      <div className="h-0.5 w-40 bg-black mx-auto" />
                      <span className="font-bold uppercase tracking-wider block mt-1 text-[10px]">
                        {language === 'mr' ? 'ग्राहकाची स्वाक्षरी' : 'CUSTOMER SIGN'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* PAGE 2 CONTENT (TERMS & CONDITIONS) */}
        <div className="w-[100%] h-screen min-h-screen p-8 bg-white border border-transparent box-border flex flex-col justify-between print-page" style={{ pageBreakBefore: 'always' }}>
          <div>
            <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
              <span className="text-xs font-bold font-mono tracking-widest text-stone-500 uppercase">
                {language === 'mr' ? 'कराराचे पान २' : 'PAGE 2 OF AGREEMENT'}
              </span>
              <span className="text-xs font-black font-mono tracking-widest text-[#593622] uppercase">
                {language === 'mr' ? 'नियम आणि अटी' : 'TERMS AND CONDITIONS'}
              </span>
            </div>

            <div className="space-y-2.5 text-[10px] leading-relaxed text-stone-800 text-justify">
              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '१. ॲडव्हान्स पेमेंटची आवश्यकता :-' : '1. ADVANCE PAYMENT REQUIREMENT :-'}
                </strong>
                {language === 'mr' ? (
                  <p>काम सुरू करण्यापूर्वी मी एकूण आदेशाच्या / ऑर्डरच्या मुल्याच्या <span className="underline font-extrabold text-stone-950">₹{advance.toLocaleString() || '_______'}</span> चे ॲडव्हान्स पेमेंट देण्यास सहमत आहे. ॲडव्हान्स पेमेंटची एकूण रक्कम <span className="underline font-extrabold text-stone-950">₹{advance.toLocaleString() || '_______________________'}</span> आहे.</p>
                ) : (
                  <p>I agree to pay an advance payment amounting <span className="underline font-extrabold text-stone-950">₹{advance.toLocaleString() || '_______'}</span> of the total order cost prior to the commencement of work. The advance payment amount is <span className="underline font-extrabold text-stone-950">₹{advance.toLocaleString() || '_______________________'}</span>.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '२. पेमेंट वेळापत्रक (पेमेंट शेड्युल) :-' : '2. PAYMENT SCHEDULE :-'}
                </strong>
                {language === 'mr' ? (
                  <p>करार किंवा करारावर स्वाक्षरी केल्यावर लगेचच ॲडव्हान्स पेमेंट भरणे आवश्यक आहे. पुढील देयके मुख्य करारामध्ये नमूद केलेल्या पेमेंट वेळापत्रकानुसार केली जातील. माल पाठवण्यापूर्वी पूर्ण पेमेंट मिळणे अनिवार्य आहे.</p>
                ) : (
                  <p>The advance payment is due immediately upon signing the contract or agreement. Subsequent payments will be made as per the agreed payment schedule outlined in the main contract. Full payment must be received before the dispatch of goods.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '३. रिफंड न मिळण्याबाबतची अट (नॉन-रिफंडेबल) :-' : '3. NON-REFUNDABLE CLAUSE :-'}
                </strong>
                {language === 'mr' ? (
                  <p>काम सुरू करण्यापूर्वी भरलेली ॲडव्हान्स पेमेंटची रक्कम नॉन-रिफंडेबल (परत न मिळणारी) असेल. ऑर्डर दिल्यानंतर २४ तासांनंतर कोणतीही रक्कम परत केली जाणार नाही.</p>
                ) : (
                  <p>The advance payment is non-refundable. No refunds will be provided for order cancellations requested after 24 hours of placing the order.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '४. काम सुरू करणे :-' : '4. SERVICE COMMENCEMENT :-'}
                </strong>
                {language === 'mr' ? (
                  <p>ॲडव्हान्स पेमेंट आणि आवश्यक वैशिष्ट्यांची माहिती मिळाल्यानंतरच कारखाना स्तरावर प्रत्यक्ष उत्पादनाचे काम सुरू केले जाईल.</p>
                ) : (
                  <p>Work will commence only after the advance payment has been processed and all dynamic specifications are fully finalized and logged.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '५. कामाची व्याप्ती :-' : '5. SCOPE OF WORK :-'}
                </strong>
                {language === 'mr' ? (
                  <p>ऑर्डर दिल्यानंतर उत्पादनाच्या रचनेत किंवा वैशिष्ट्यांमध्ये बदल करायचा असल्यास अतिरिक्त शुल्क आकारले जाऊ शकते.</p>
                ) : (
                  <p>Any additional structural changes or specifications requested after production starts will incur separate design and labor fees.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '६. डिलिव्हरी (वितरण) :-' : '6. DELIVERY :-'}
                </strong>
                {language === 'mr' ? (
                  <p>ग्राहकाद्वारे दिलेल्या चुकीच्या पत्त्यामुळे माल वेळेत न पोहोचल्यास वर्कशॉप जबाबदार राहणार नाही. डिलिव्हरी तारखेमध्ये २-३ दिवसांचा फरक असू शकतो.</p>
                ) : (
                  <p>The workshop is not liable for delayed shipments caused by incorrect billing/shipping address entries. The standard delivery window may fluctuate by 2-3 business days.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '७. वस्तू परत मिळणे आणि रिफंड :-' : '7. RETURNS AND REFUNDS :-'}
                </strong>
                {language === 'mr' ? (
                  <p>वस्तू मिळाल्यापासून २ दिवसांच्या आत कोणत्याही दोषाबद्दल किंवा त्रुटीबद्दल वर्कशॉपला कळवणे आवश्यक आहे.</p>
                ) : (
                  <p>Clients must report any physical defects or configuration issues within 2 days of receiving the delivery to qualify for remediation.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '८. ऑर्डर रद्द करणे :-' : '8. ORDER CANCELLATION :-'}
                </strong>
                {language === 'mr' ? (
                  <p>ग्राहक २४ तासांच्या आत त्यांची ऑर्डर रद्द करू शकतात. गैरवापर किंवा अनधिकृत बदलांमुळे नुकसान झाल्यास वर्कशॉप जबाबदार राहणार नाही.</p>
                ) : (
                  <p>Order cancellation requests must be received within 24 hours of placing the order. Damaged goods resulting from client abuse or self-repair are ineligible for support.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '९. अंशतः डिलिव्हरी (पार्ट डिलिव्हरी) :-' : '9. PART DELIVERY :-'}
                </strong>
                {language === 'mr' ? (
                  <p>अंशतः डिलिव्हरीच्या बाबतीत, डिलिव्हरी आणि इन्स्टॉलेशनचे संपूर्ण शुल्क द्यावे लागेल, तसेच वितरित मालाचे पूर्ण पैसे देणे बंधनकारक असेल.</p>
                ) : (
                  <p>In cases where partial batch delivery is accepted, all setup, labor, and transport charges are due immediately alongside full cost for the delivered units.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '१०. नियमांची स्वीकृती :-' : '10. ACCEPTANCE OF TERMS :-'}
                </strong>
                {language === 'mr' ? (
                  <p>ॲडव्हान्स रक्कम भरून, ग्राहक प्रमाणित करतो की त्यांनी वरील सर्व अटी व शर्ती काळजीपूर्वक वाचल्या आहेत आणि त्या त्यांना पूर्णपणे मान्य आहेत.</p>
                ) : (
                  <p>By executing the advance transaction, the client explicitly warrants that they have read, understood, and consented to all rules laid out herein.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 text-center text-xs font-mono border-t pt-8 mt-4">
            <div className="space-y-12">
              <span className="text-stone-450 block font-light">
                {language === 'mr' ? 'भिसेज् वर्कशॉप व्यवस्थापन' : "Bhise'z Workshop Management"}
              </span>
              <div>
                <div className="h-0.5 w-40 bg-black mx-auto" />
                <span className="font-bold uppercase tracking-wider block mt-1.5 text-[10px]">
                  {language === 'mr' ? 'व्यवस्थापकाची स्वाक्षरी' : 'MANAGER SIGN'}
                </span>
              </div>
            </div>
            <div className="space-y-12">
              <span className="text-stone-450 block font-light">
                {language === 'mr' ? 'ग्राहकाची सहमती स्वीकृती' : 'Client Confirmation Acceptance'}
              </span>
              <div>
                <div className="h-0.5 w-40 bg-black mx-auto" />
                <span className="font-bold uppercase tracking-wider block mt-1.5 text-[10px]">
                  {language === 'mr' ? 'ग्राहकाची स्वाक्षरी' : 'CUSTOMER SIGN'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PAGES 3+ CONTENT (REFERENCE DRAWINGS & BLUEPRINTS) */}
        {imagePages.map((pageImgs, pageIdx) => (
          <div
            key={`print_drawings_page_${pageIdx}`}
            className="w-[100%] h-screen min-h-screen p-8 bg-white border border-transparent box-border flex flex-col justify-between print-page"
            style={{ pageBreakBefore: 'always' }}
          >
            <div>
              <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-6">
                <span className="text-xs font-bold font-mono tracking-widest text-stone-500 uppercase">
                  {language === 'mr' ? `कराराचे पान ${3 + pageIdx}` : `PAGE ${3 + pageIdx} OF AGREEMENT`}
                </span>
                <span className="text-xs font-black font-mono tracking-widest text-[#593622] uppercase">
                  {language === 'mr' ? 'संदर्भ रेखाचित्रे आणि ब्ल्यूप्रिंट्स' : 'REFERENCE DRAWINGS & BLUEPRINTS'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-4">
                {pageImgs.map((img) => (
                  <div
                    key={img.id}
                    className="border border-stone-400 rounded-lg overflow-hidden aspect-[4/3] bg-stone-50 flex items-center justify-center p-2"
                  >
                    <img
                      src={img.url}
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 text-center text-xs font-mono border-t pt-8">
              <div className="space-y-12">
                <span className="text-stone-450 block font-light">
                  {language === 'mr' ? 'भिसेज् वर्कशॉप व्यवस्थापन' : "Bhise'z Workshop Management"}
                </span>
                <div>
                  <div className="h-0.5 w-40 bg-black mx-auto" />
                  <span className="font-bold uppercase tracking-wider block mt-1.5 text-[10px]">
                    {language === 'mr' ? 'व्यवस्थापकाची स्वाक्षरी' : 'MANAGER SIGN'}
                  </span>
                </div>
              </div>
              <div className="space-y-12">
                <span className="text-stone-450 block font-light">
                  {language === 'mr' ? 'ग्राहकाची सहमती स्वीकृती' : 'Client Confirmation Acceptance'}
                </span>
                <div>
                  <div className="h-0.5 w-40 bg-black mx-auto" />
                  <span className="font-bold uppercase tracking-wider block mt-1.5 text-[10px]">
                    {language === 'mr' ? 'ग्राहकाची स्वाक्षरी' : 'CUSTOMER SIGN'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

      </div>

    </div>
  );
}
