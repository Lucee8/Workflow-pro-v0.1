import React from 'react';
import { Customer, Order, User, Payment } from '../types';
import { FileText, Printer, Sparkles, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';

interface DetailOrderFormTabProps {
  orders: Order[];
  customers: Customer[];
  users: User[];
  payments: Payment[];
}

export default function DetailOrderFormTab({ orders, customers, users, payments }: DetailOrderFormTabProps) {
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>('');
  const [language, setLanguage] = React.useState<'en' | 'mr'>('en');

  // Form Fields - Page 1
  const [orderDate, setOrderDate] = React.useState('');
  const [deliveryDate, setDeliveryDate] = React.useState('');
  const [orderNo, setOrderNo] = React.useState('');
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
  
  // Final Rate is calculated as: Quoted Rate + Cushion + Hardware - Discount
  const finalRate = React.useMemo(() => {
    return Math.max(0, Number(quotedRate) + Number(cushion) + Number(hardware) - Number(discount));
  }, [quotedRate, cushion, hardware, discount]);

  const [packingForwarding, setPackingForwarding] = React.useState<number>(0);
  const [advance, setAdvance] = React.useState<number>(0);
  const [transportation, setTransportation] = React.useState<number>(0);

  // Balance is calculated as: (Final Rate * Qty) + Packing & Forwarding + Transportation - Advance
  const balance = React.useMemo(() => {
    const totalAmount = finalRate * Number(qty);
    return Math.max(0, totalAmount + Number(packingForwarding) + Number(transportation) - Number(advance));
  }, [finalRate, qty, packingForwarding, transportation, advance]);

  const [polishShade, setPolishShade] = React.useState('');
  const [paymentMode, setPaymentMode] = React.useState<'CASH' | 'BANK'>('CASH');
  const [typeOfPolish, setTypeOfPolish] = React.useState<'HAND' | 'MACHINE'>('HAND');

  // Load selected order details
  const handleLoadOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    setSelectedOrderId(orderId);

    // Get linked customer info
    const cust = customers.find((c) => c.id === order.customer_id);

    // Get linked payment advance
    const orderPayment = payments ? payments.find((p) => p.order_id === order.id) : null;
    const orderAdvance = orderPayment ? orderPayment.advance_paid : 0;

    setOrderDate(order.order_date || new Date().toISOString().split('T')[0]);
    setDeliveryDate(order.delivery_date || '');
    setOrderNo(order.id);
    setArticleNo(order.article_no || '');
    setToArticleNo('');
    setCustomerName(cust ? cust.name : '');
    setWhatsappNo(cust ? cust.phone : '');
    setAddress(cust && cust.address ? cust.address : '');

    setProductName(`${order.category} › ${order.sub_category} (${order.size || 'Standard Size'})`);
    setItemDescription(`Structure: ${order.material}. Finish: ${order.finish_type || order.finish || ''}. Color: ${order.color_shade}. ${order.special_notes || ''}`);
    setQty(order.no_of_units || 1);
    
    // Attempt standard amount estimations, allow editing
    const estimatedUnitCost = order.material === 'Plywood' ? 12000 : 25000;
    setQuotedRate(estimatedUnitCost);
    setAmount(estimatedUnitCost * (order.no_of_units || 1));
    setCushion(0);
    setDiscount(0);
    setHardware(0);
    setPackingForwarding(1200);
    setTransportation(1800);
    setAdvance(orderAdvance);

    setPolishShade(order.color_shade || 'Natural');
    setTypeOfPolish((order.finish_type || order.finish || '').toLowerCase().includes('hand') ? 'HAND' : 'MACHINE');
  };

  const handlePrint = () => {
    window.print();
  };

  const getWhatsAppUrl = () => {
    const cleanNumber = whatsappNo.replace(/\D/g, '');
    const isMr = language === 'mr';
    const text = isMr ? `*भिसेज् वुड वर्कशॉप (BHISE'Z WOOD WORKSHOP)*
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
    setOrderDate(new Date().toISOString().split('T')[0]);
    setDeliveryDate('');
    setOrderNo('');
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
  };

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
            <span className="text-xs font-bold text-stone-600 shrink-0">Auto-Fill from Order:</span>
            <select
              value={selectedOrderId}
              onChange={(e) => handleLoadOrder(e.target.value)}
              className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#593622] text-stone-750 font-semibold w-full sm:w-64 max-w-sm"
            >
              <option value="">-- Select active workshop order --</option>
              {orders.map((ord) => {
                const cust = customers.find((c) => c.id === ord.customer_id);
                return (
                  <option key={ord.id} value={ord.id}>
                    {ord.article_no || ord.id} • {cust?.name || 'Unknown'} ({ord.sub_category})
                  </option>
                );
              })}
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
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Delivery Date</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
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
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shipping/Billing complete address"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider border-b pb-2">II. Product Line details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Premium Hydraulic Bed"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div className="md:col-span-3 text-xs">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div className="md:col-span-3 text-xs">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Estimated Unit Rate (₹)</label>
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
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Item Description / Specifications</label>
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={3}
                placeholder="Mention fine material compositions, structural wood options, finish layouts, grain matches, drawer fittings, etc..."
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
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
          </div>

          <div>
            <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider border-b pb-2">IV. Polishing, Materials &amp; Mode</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Polish Shade</label>
              <input
                type="text"
                value={polishShade}
                onChange={(e) => setPolishShade(e.target.value)}
                placeholder="e.g. Walnut, Natural Teak"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as 'CASH' | 'BANK')}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-bold"
              >
                <option value="CASH">CASH</option>
                <option value="BANK">BANK</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">Polish Application Type</label>
              <select
                value={typeOfPolish}
                onChange={(e) => setTypeOfPolish(e.target.value as 'HAND' | 'MACHINE')}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-lg text-xs focus:outline-none focus:ring-0 text-stone-750 font-bold"
              >
                <option value="HAND">HAND POLISH (Manual craft)</option>
                <option value="MACHINE">MACHINE POLISH (Spray/Lacquer)</option>
              </select>
            </div>
          </div>

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
            
            {/* MINIFIED PAGE 1 */}
            <div className="bg-white border rounded shadow-xs p-6 origin-top scale-100 transition-all text-[11px] leading-snug font-mono text-black select-none max-w-full">
              <div className="border-2 border-black p-4 space-y-4">
                <div className="text-center font-bold tracking-wider text-sm border-b pb-2 select-none uppercase">
                  {language === 'mr' ? 'भिसेज् वुड वर्कशॉप - सविस्तर ऑर्डर फॉर्म' : "BHISE'Z WORKSHOP - DETAIL ORDER FORM"}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><strong>{language === 'mr' ? 'ऑर्डरची तारीख:' : 'ORDER DATE:'}</strong> {orderDate || '_________________'}</div>
                  <div><strong>{language === 'mr' ? 'वितरणाची तारीख:' : 'DELIVERY DATE:'}</strong> {deliveryDate || '_________________'}</div>
                  <div><strong>{language === 'mr' ? 'ऑर्डर क्र.:' : 'ORDER NO:'}</strong> {orderNo || '_________________'}</div>
                  <div><strong>{language === 'mr' ? 'आर्टिकल क्र.:' : 'ARTICLE NO:'}</strong> {articleNo || '_________________'}</div>
                  <div><strong>{language === 'mr' ? 'पर्यायी आर्टिकल क्र.:' : 'TO ARTICLE NO:'}</strong> {toArticleNo || '_________________'}</div>
                  <div><strong>{language === 'mr' ? 'व्हॉट्सॲप क्र.:' : 'WHATSAPP NO:'}</strong> {whatsappNo || '_________________'}</div>
                  <div className="col-span-2"><strong>{language === 'mr' ? 'ग्राहकाचे नाव:' : 'CUSTOMER NAME:'}</strong> {customerName || '_________________'}</div>
                  <div className="col-span-2"><strong>{language === 'mr' ? 'पत्ता:' : 'ADDRESS:'}</strong> {address || '__________________________________________________'}</div>
                </div>

                <div className="border-t border-b border-black py-2 my-2">
                  <div className="font-bold underline mb-1 uppercase text-[10px]">{language === 'mr' ? 'उत्पादनाचा तपशील:' : 'Product details:'}</div>
                  <div><strong>{language === 'mr' ? 'उत्पादनाचे नाव:' : 'PRODUCT NAME:'}</strong> {productName || '_________________________________'}</div>
                  <div><strong>{language === 'mr' ? 'सविस्तर वैशिष्ट्ये:' : 'ITEM DESCRIPTION:'}</strong> {itemDescription || '_________________________________'}</div>
                  <div className="flex gap-4 mt-1">
                    <div><strong>{language === 'mr' ? 'नग:' : 'QTY:'}</strong> {qty}</div>
                    <div><strong>{language === 'mr' ? 'प्रति नग दर:' : 'UNIT RATE:'}</strong> ₹{quotedRate.toLocaleString()}</div>
                    <div><strong>{language === 'mr' ? 'एकूण रक्कम:' : 'AMOUNT:'}</strong> ₹{(quotedRate * qty).toLocaleString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                  <div><strong>{language === 'mr' ? 'मूळ दर:' : 'QUOTED RATE:'}</strong> ₹{quotedRate.toLocaleString()}</div>
                  <div><strong>{language === 'mr' ? 'कुशन किंमत:' : 'CUSHION:'}</strong> ₹{cushion.toLocaleString()}</div>
                  <div><strong>{language === 'mr' ? 'सवलत (डिस्काउंट):' : 'DISCOUNT:'}</strong> ₹{discount.toLocaleString()}</div>
                  <div><strong>{language === 'mr' ? 'हार्डवेअर खर्च:' : 'HARDWARE:'}</strong> ₹{hardware.toLocaleString()}</div>
                  <div className="font-bold"><strong>{language === 'mr' ? 'अंतिम दर:' : 'FINAL RATE:'}</strong> ₹{finalRate.toLocaleString()}</div>
                  <div><strong>{language === 'mr' ? 'पॅकिंग व फॉरवर्डिंग:' : 'PACKING & FORWARDING:'}</strong> ₹{packingForwarding.toLocaleString()}</div>
                  <div className="font-bold"><strong>{language === 'mr' ? 'ऍडव्हान्स पेमेंट:' : 'ADVANCE:'}</strong> ₹{advance.toLocaleString()}</div>
                  <div><strong>{language === 'mr' ? 'वाहतूक खर्च:' : 'TRANSPORTATION:'}</strong> ₹{transportation.toLocaleString()}</div>
                  <div className="font-bold text-amber-900 col-span-2 text-xs border-t border-stone-200 pt-1 flex justify-between">
                    <span>{language === 'mr' ? 'उर्वरित शिल्लक रक्कम:' : 'BALANCE REMAINING:'}</span>
                    <span>₹{balance.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-2 border-t border-dashed">
                  <div><strong>{language === 'mr' ? 'पॉलिश शेड:' : 'POLISH SHADE:'}</strong> {polishShade || '_________________'}</div>
                  <div><strong>{language === 'mr' ? 'पैसे देण्याची पद्धत:' : 'PAYMENT MODE:'}</strong> {paymentMode}</div>
                  <div className="col-span-2"><strong>{language === 'mr' ? 'पॉलिशचा प्रकार:' : 'TYPE OF POLISH:'}</strong> {typeOfPolish} ({language === 'mr' ? 'हात पॉलिश / मशीन पॉलिश' : 'HAND / MACHINE'})</div>
                </div>

                <div className="grid grid-cols-2 gap-8 text-center pt-8 border-t border-black">
                  <div className="border-t border-stone-350 pt-1"><strong>{language === 'mr' ? 'व्यवस्थापकाची स्वाक्षरी' : 'MANAGER SIGN'}</strong></div>
                  <div className="border-t border-stone-350 pt-1"><strong>{language === 'mr' ? 'ग्राहकाची स्वाक्षरी' : 'CUSTOMER SIGN'}</strong></div>
                </div>
              </div>
            </div>

            {/* MINIFIED PAGE 2 */}
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
          </div>
        </div>

      </div>

      {/* PRINT-ONLY EMBEDDED AREA (Forces visibility in system window print and structures into clean pages) */}
      <div className="hidden print:block fixed inset-0 bg-white text-black font-sans z-50 p-0 m-0">
        
        {/* PAGE 1 CONTENT */}
        <div className="w-[100%] h-screen min-h-screen p-8 bg-white border border-transparent box-border flex flex-col justify-between" style={{ pageBreakAfter: 'always' }}>
          <div>
            <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-6">
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
                <p className="text-[9px] mt-1 text-stone-600 font-mono">{language === 'mr' ? 'संदर्भ क्र.:' : 'Invoice Ref:'} #{orderNo || 'MANUAL'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono border border-black p-4 rounded mb-6">
              <div className="space-y-1">
                <div><strong>{language === 'mr' ? 'ऑर्डरची तारीख:' : 'ORDER DATE:'}</strong> {orderDate || '_______________________'}</div>
                <div><strong>{language === 'mr' ? 'वितरणाची तारीख:' : 'DELIVERY DATE:'}</strong> {deliveryDate || '_______________________'}</div>
                <div><strong>{language === 'mr' ? 'ऑर्डर क्रमांक:' : 'ORDER NO:'}</strong> {orderNo || '_______________________'}</div>
                <div><strong>{language === 'mr' ? 'आर्टिकल क्रमांक:' : 'ARTICLE NO:'}</strong> {articleNo || '_______________________'}</div>
                <div><strong>{language === 'mr' ? 'पर्यायी आर्टिकल क्र.:' : 'TO ARTICLE NO:'}</strong> {toArticleNo || '_______________________'}</div>
              </div>
              <div className="space-y-1 border-l border-stone-300 pl-4">
                <div><strong>{language === 'mr' ? 'ग्राहकाचे नाव:' : 'CUSTOMER NAME:'}</strong> {customerName || '_______________________'}</div>
                <div><strong>{language === 'mr' ? 'व्हॉट्सॲप क्र.:' : 'WHATSAPP NO:'}</strong> {whatsappNo || '_______________________'}</div>
                <div><strong>{language === 'mr' ? 'पत्ता:' : 'ADDRESS:'}</strong> <span className="text-[11px] font-sans">{address || '__________________________________________________'}</span></div>
              </div>
            </div>

            {/* PRODUCT SPECIFICATION BLOCK */}
            <div className="border border-black rounded p-4 mb-6">
              <h2 className="text-[10px] font-black uppercase tracking-widest border-b pb-1 mb-2">
                {language === 'mr' ? 'वस्तूंचे तपशील आणि प्रमाण' : 'Item Specifications & Quantity'}
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
                  <tr>
                    <td className="py-2.5 font-bold">{productName || 'Custom Engineered Furniture Unit'}</td>
                    <td className="py-2.5 text-center">{qty}</td>
                    <td className="py-2.5 text-right">₹{quotedRate.toLocaleString()}</td>
                    <td className="py-2.5 text-right font-bold">₹{(quotedRate * qty).toLocaleString()}</td>
                  </tr>
                  <tr className="border-t border-dashed border-stone-300">
                    <td colSpan={4} className="py-2 text-[10px] text-stone-700 italic">
                      <strong>{language === 'mr' ? 'सविस्तर वैशिष्ट्ये:' : 'Item Spec/Description:'}</strong> {itemDescription || 'Standard handcrafted woodwork structure with premium selected materials.'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FINANCIAL CALCULATIONS SECTION */}
            <div className="border border-black rounded p-4 mb-6">
              <h2 className="text-[10px] font-black uppercase tracking-widest border-b pb-1 mb-2">
                {language === 'mr' ? 'वित्तीय कपातीचा सविस्तर गोषवारा' : 'Detailed Financial Specification'}
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-mono">
                <div className="flex justify-between border-b border-stone-200 pb-0.5">
                  <span>{language === 'mr' ? 'मूळ दर:' : 'QUOTED BASE RATE:'}</span>
                  <span>₹{quotedRate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-0.5">
                  <span>{language === 'mr' ? 'कुशन किंमत:' : 'CUSHION COST:'}</span>
                  <span>₹{cushion.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-0.5">
                  <span>{language === 'mr' ? 'हार्डवेअर खर्च:' : 'HARDWARE CHARGES:'}</span>
                  <span>₹{hardware.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-0.5 text-rose-750 font-bold">
                  <span>{language === 'mr' ? '(-) सवलत (डिस्काउंट):' : '(-) DISCOUNT ALLOWED:'}</span>
                  <span>₹{discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b-2 border-black pb-0.5 font-black text-stone-900">
                  <span>{language === 'mr' ? 'अंतिम दर:' : 'FINAL AGREED RATE:'}</span>
                  <span>₹{finalRate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-0.5">
                  <span>{language === 'mr' ? 'पॅकिंग व फॉरवर्डिंग:' : 'PACKING / FORWARDING:'}</span>
                  <span>₹{packingForwarding.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-0.5">
                  <span>{language === 'mr' ? 'वाहतूक खर्च:' : 'TRANSPORTATION FEE:'}</span>
                  <span>₹{transportation.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-0.5 text-green-800 font-bold">
                  <span>{language === 'mr' ? '(-) ऍडव्हान्स पेमेंट:' : '(-) ADVANCE DEPOSITED:'}</span>
                  <span>₹{advance.toLocaleString()}</span>
                </div>
                <div className="col-span-2 flex justify-between pt-1 font-black text-[#593622] text-sm border-t border-black uppercase mt-1">
                  <span>{language === 'mr' ? 'डिलिव्हरीपूर्वी देय उर्वरित शिल्लक रक्कम:' : 'Oustanding Balance Due prior to Dispatch:'}</span>
                  <span>₹{balance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* TEHNICAL POLISH SPEC */}
            <div className="border border-black rounded p-4 mb-4 grid grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <strong>{language === 'mr' ? 'पॉलिश शेड:' : 'POLISH SHADE:'}</strong>
                <p className="mt-0.5 font-bold uppercase">{polishShade || (language === 'mr' ? 'नैसर्गिक लाकूड' : 'Natural Lacquer')}</p>
              </div>
              <div>
                <strong>{language === 'mr' ? 'पैसे देण्याची पद्धत:' : 'PAYMENT MODE:'}</strong>
                <p className="mt-0.5 font-bold uppercase">{paymentMode}</p>
              </div>
              <div>
                <strong>{language === 'mr' ? 'पॉलिशचा प्रकार:' : 'TYPE OF POLISH:'}</strong>
                <p className="mt-0.5 font-bold uppercase">{typeOfPolish} POLISH ({language === 'mr' ? 'हात / मशीन' : 'HAND/MACHINE'})</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 text-center text-xs font-mono border-t pt-8">
            <div className="space-y-12">
              <span className="text-stone-400 block font-light">{language === 'mr' ? 'भिसेज् वर्कशॉप व्यवस्थापन' : "Bhise'z Workshop Management"}</span>
              <div>
                <div className="h-0.5 w-40 bg-black mx-auto" />
                <span className="font-bold uppercase tracking-wider block mt-1.5 text-[10px]">{language === 'mr' ? 'व्यवस्थापकाची स्वाक्षरी' : 'MANAGER SIGN'}</span>
              </div>
            </div>
            <div className="space-y-12">
              <span className="text-stone-400 block font-light">{language === 'mr' ? 'ग्राहकाची सहमती स्वीकृती' : 'Client Confirmation Acceptance'}</span>
              <div>
                <div className="h-0.5 w-40 bg-black mx-auto" />
                <span className="font-bold uppercase tracking-wider block mt-1.5 text-[10px]">{language === 'mr' ? 'ग्राहकाची स्वाक्षरी' : 'CUSTOMER SIGN'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE 2 CONTENT (TERMS & CONDITIONS) */}
        <div className="w-[100%] h-screen min-h-screen p-8 bg-white border border-transparent box-border flex flex-col justify-between" style={{ pageBreakBefore: 'always' }}>
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
                  <p>सर्व्हिस प्रोव्हायडरकडून कराराचा भंग झाल्याशिवाय ॲडव्हान्स पेमेंट परत केले जाणार नाही. २४ तासांनंतर ॲडव्हान्स पेमेंट कोणत्याही परिस्थितीत परत केले जाणार नाही.</p>
                ) : (
                  <p>The advance payment is non-refundable except in the event of a breach of contract by the Service Provider. Advance payment will not be refunded after 24 hours.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '४. काम सुरू करणे :-' : '4. SERVICE COMMENCEMENT :-'}
                </strong>
                {language === 'mr' ? (
                  <p>ॲडव्हान्स पेमेंट आणि तुमच्या आवश्यकतेबद्दल आवश्यक ती कागदपत्रे किंवा माहिती मिळाल्यानंतरच काम सुरू होईल. ॲडव्हान्स पेमेंटला विलंब झाल्यास उत्पादन सुरू होण्यास तोच समान विलंब होऊ शकतो.</p>
                ) : (
                  <p>Work will commence upon receipt of the advance payment and any required documentation or information from you about your requirement. Any delay in the advance payment may result in a corresponding delay in the commencement of manufacturing.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '५. कामाची व्याप्ती :-' : '5. SCOPE OF WORK :-'}
                </strong>
                {language === 'mr' ? (
                  <p>मूळ ऑर्डरमधील कोणतेही अतिरिक्त काम किंवा बदलांसाठी अतिरिक्त शुल्क लागू होईल.</p>
                ) : (
                  <p>Any additional work or changes to the initial order will be subject to additional charges.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '६. डिलिव्हरी (वितरण) :-' : '6. DELIVERY :-'}
                </strong>
                {language === 'mr' ? (
                  <p>डिलिव्हरीची अचूक माहिती देण्याची जबाबदारी माझी आहे. माझ्याकडून चुकीची किंवा अपूर्ण माहिती दिल्यामुळे डिलिव्हरी यशस्वी न झाल्यास विक्रेता जबाबदार राहणार नाही. डिलिव्हरीची तारीख २-३ दिवसांनी बदलू शकते.</p>
                ) : (
                  <p>I am responsible for providing accurate delivery information. The Seller is not liable for delivery failures due to incorrect or incomplete information provided by me. The delivery date may vary by 2-3 days.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '७. वस्तू परत मिळणे आणि रिफंड :-' : '7. RETURNS AND REFUNDS :-'}
                </strong>
                {language === 'mr' ? (
                  <p>डिलिव्हरी मिळाल्यापासून २ दिवसांच्या आत मी कोणत्याही सदोष किंवा चुकीच्या वस्तूची माहिती विक्रेत्याला देईन. वस्तू सदोष किंवा चुकीची असल्याशिवाय वस्तू परत करण्याच्या वाहतूक खर्चासाठी मी स्वतः जबाबदार असेन.</p>
                ) : (
                  <p>I will notify the Seller of any defective or incorrect items within 2 days of delivery. I am responsible for return shipping costs unless the item is defective or incorrect.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '८. ऑर्डर रद्द करणे :-' : '8. ORDER CANCELLATION :-'}
                </strong>
                {language === 'mr' ? (
                  <p>खरेदीदार ऑर्डर दिल्यानंतर २४ तासांच्या आत विक्रेत्याशी संपर्क साधून आपली ऑर्डर रद्द करू शकतात. गैरवापर, दुर्लक्ष किंवा अनधिकृत दुरुस्तीमुळे वस्तू खराब झाल्यास विक्रेता जबाबदार नाही.</p>
                ) : (
                  <p>The Buyer may cancel their order within 24 hours of placing it by contacting the Seller. The Seller is not liable if the product is damaged due to misuse, neglect, or unauthorized repair.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '९. अंशतः डिलिव्हरी (पार्ट डिलिव्हरी) :-' : '9. PART DELIVERY :-'}
                </strong>
                {language === 'mr' ? (
                  <p>अंशतः डिलिव्हरीच्या बाबतीत (पार्ट डिलिव्हरी), मी डिलिव्हरी चार्जेस तसेच इन्स्टॉलेशन चार्जेस भरण्यास सहमत आहे. ज्या उत्पादनांची डिलिव्हरी होणार आहे त्यांची पूर्ण रक्कम आणि भविष्यात डिलीव्हर होणाऱ्या उर्वरित उत्पादनांचे ४०% ॲडव्हान्स देण्यास मी सहमत आहे.</p>
                ) : (
                  <p>In case of part delivery, I agree to pay the delivery charges as well as installation charges. I agree to pay the full amount of the products which are to be delivered and 40% Advance of the remaining products which will be delivered in future.</p>
                )}
              </div>

              <div>
                <strong className="block text-stone-900 border-b pb-0.5 mb-1 text-[11px] uppercase">
                  {language === 'mr' ? '१०. नियमांची स्वीकृती :-' : '10. ACCEPTANCE OF TERMS :-'}
                </strong>
                {language === 'mr' ? (
                  <p>ॲडव्हान्स पेमेंट करून, मी कबूल करतो की मी हे नियम आणि अटी वाचल्या आहेत, समजून घेतल्या आहेत आणि मी त्यांच्याशी सहमत आहे.</p>
                ) : (
                  <p>By making the advance payment, I acknowledge that I have read, understood, and agree to these terms and conditions.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 text-center text-xs font-mono border-t pt-8 mt-4">
            <div className="space-y-12">
              <span className="text-stone-400 block font-light">
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

      </div>

    </div>
  );
}
