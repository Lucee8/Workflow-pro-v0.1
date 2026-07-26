/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Customer, User, Order, OrderPriority, OrderStage } from '../types';
import { generateUUID, generateArticleNumber } from '../db/store';
import { generateNextParentOrderId, parseParentOrderSequence } from '../db/orderIdService';
import { 
  Users, 
  HelpCircle, 
  Search, 
  UserPlus, 
  Image as ImageIcon, 
  Trash2,   
  Calendar, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Minus,
  Camera,
  UploadCloud,
  Video
} from 'lucide-react';

// Preset photos for workshop previews
const FURNITURE_PHOTOS = [
  'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1558882224-cca166733360?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=800',
];

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

// Helper scale and compression utility to keep Base64 strings well under Firestore limits (<100KB)
function compressImage(dataUrl: string, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

interface OrderFormProps {
  customers: Customer[];
  users: User[];
  orders: Order[];
  onSave: (newOrder: Order | Order[], newCustomer?: Customer) => void;
  onCancel: () => void;
  initialDraft?: any | null;
  onClearDraft?: () => void;
}

export default function OrderForm({ 
  customers, 
  users, 
  orders, 
  onSave, 
  onCancel,
  initialDraft = null,
  onClearDraft
}: OrderFormProps) {
  const [step, setStep] = React.useState(1);

  // Filter lists
  const activeCarpenters = users.filter((u) => u.role === 'carpenter' && u.is_active);
  const activePolish = users.filter((u) => u.role === 'polish_person' && u.is_active);

  // Helper workload count
  const getWorkload = (userId: string) => {
    return orders.filter((o) => (o.carpenter_id === userId || o.polish_person_id === userId) && o.current_status !== 'Ready to Dispatch').length;
  };

  // --- STEP 1: PRODUCT STATE ---
  const [category, setCategory] = React.useState('Door Frames');
  const [subCategory, setSubCategory] = React.useState('Set');
  const [size, setSize] = React.useState('6ft');
  const [customSize, setCustomSize] = React.useState('');
  const [designType, setDesignType] = React.useState<'Standard' | 'Custom'>('Standard');
  const [material, setMaterial] = React.useState('Plywood');
  const [finish, setFinish] = React.useState('hand polish');
  const [colorShade, setColorShade] = React.useState('Walnut');
  const [noOfUnits, setNoOfUnits] = React.useState(1);
  const [specialNotes, setSpecialNotes] = React.useState('');

  // --- STEP 2: CUSTOMER STATE ---
  const [searchCustQuery, setSearchCustQuery] = React.useState('');
  const [selectedCustId, setSelectedCustId] = React.useState<string | null>(null);
  const [isNewCust, setIsNewCust] = React.useState(false);
  
  // Fields for new customer OR editing
  const [custName, setCustName] = React.useState('');
  const [custPhone, setCustPhone] = React.useState('');
  const [custAddress, setCustAddress] = React.useState('');
  const [custNotes, setCustNotes] = React.useState('');
  const [whatsappOptIn, setWhatsappOptIn] = React.useState(true);

  // --- STEP 3: IMAGES STATE ---
  const [refImages, setRefImages] = React.useState<Array<{ id: string; url: string; type: 'Design Reference' }>>([]);
  const [imgUrlInput, setImgUrlInput] = React.useState('');

  // Interactive Camera & Local Upload states
  const [isWebcamActive, setIsWebcamActive] = React.useState(false);
  const [webcamStream, setWebcamStream] = React.useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const startWebcam = async () => {
    setWebcamError(null);
    setIsWebcamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // back camera on mobile or default workspace camera
        audio: false
      });
      setWebcamStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Webcam access failed:", err);
      setWebcamError(
        "Could not launch camera stream. High-safety browser policies may restrict inline webcam inside preview frames. Please use the mobile native camera button or upload standard local files directly."
      );
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setIsWebcamActive(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        compressImage(dataUrl).then((compressedUrl) => {
          setRefImages((prev) => [
            ...prev,
            { id: generateUUID(), url: compressedUrl, type: 'Design Reference' }
          ]);
        });
        stopWebcam();
      }
    }
  };

  // Safe release of streams on step transition
  React.useEffect(() => {
    if (step !== 3) {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
        setWebcamStream(null);
      }
      setIsWebcamActive(false);
    }
  }, [step]);

  React.useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [webcamStream]);

  // Handle local file uploads and camera files
  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file (PNG, JPG, WEBP, etc).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          compressImage(event.target.result as string).then((compressedUrl) => {
            setRefImages((prev) => [
              ...prev,
              { id: generateUUID(), url: compressedUrl, type: 'Design Reference' }
            ]);
          }).catch((err) => {
            console.error("Compression failed, using raw", err);
            setRefImages((prev) => [
              ...prev,
              { id: generateUUID(), url: event.target!.result as string, type: 'Design Reference' }
            ]);
          });
        }
      };
      reader.readAsDataURL(file);
    });
    // reset indicator so same file triggers change again
    e.target.value = '';
  };

  // --- STEP 4: ASSIGNMENTS STATE ---
  const [carpenterId, setCarpenterId] = React.useState(activeCarpenters[0]?.id || '');
  const [polishPersonId, setPolishPersonId] = React.useState(activePolish[0]?.id || '');
  const [carpenterLabourRate, setCarpenterLabourRate] = React.useState<number | ''>('');
  const [polishLabourRate, setPolishLabourRate] = React.useState<number | ''>('');
  const [carpenterDeliveryDate, setCarpenterDeliveryDate] = React.useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // default today + 7 days
  );
  const [polishDeliveryDate, setPolishDeliveryDate] = React.useState(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // default today + 10 days
  );

  // --- MULTI-PRODUCT ASSIGNMENT TAB STATE ---
  const [productsList, setProductsList] = React.useState<Array<{
    id: string;
    productName: string;
    category: string;
    subCategory: string;
    size: string;
    customSize?: string;
    designType: 'Standard' | 'Custom';
    material: string;
    finish: string;
    colorShade: string;
    qty: number;
    specialNotes?: string;
    quotedRate?: number;
    cushion?: number;
    discount?: number;
    hardware?: number;
    finalRate?: number;
    amount?: number;
    refImages?: Array<{ id: string; url: string; type: 'Design Reference' }>;
    carpenterId: string;
    carpenterLabourRate: number | '';
    carpenterDeliveryDate: string;
    polishPersonId: string;
    polishLabourRate: number | '';
    polishDeliveryDate: string;
  }>>([]);
  const [activeProductIndex, setActiveProductIndex] = React.useState<number>(0);

  // Sync state for step 4 if productsList is not initialized from draft
  React.useEffect(() => {
    if (step === 4 && productsList.length === 0) {
      const defaultCarpenter = activeCarpenters[0]?.id || '';
      const defaultPolish = activePolish[0]?.id || '';
      const defaultCarpDate = carpenterDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const defaultPolDate = polishDeliveryDate || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const pName = `${subCategory} (${size === 'Custom' ? customSize || 'Custom' : size})`;
      setProductsList([
        {
          id: 'item_1_' + generateUUID().split('-')[0],
          productName: pName,
          category,
          subCategory,
          size,
          customSize,
          designType,
          material,
          finish,
          colorShade,
          qty: noOfUnits,
          specialNotes,
          refImages,
          carpenterId: carpenterId || defaultCarpenter,
          carpenterLabourRate: carpenterLabourRate !== '' ? carpenterLabourRate : '',
          carpenterDeliveryDate: defaultCarpDate,
          polishPersonId: polishPersonId || defaultPolish,
          polishLabourRate: polishLabourRate !== '' ? polishLabourRate : '',
          polishDeliveryDate: defaultPolDate,
        },
      ]);
      setActiveProductIndex(0);
    }
  }, [step]);

  const handleSelectProductTab = (index: number) => {
    setActiveProductIndex(index);
    const prod = productsList[index];
    if (prod) {
      setCarpenterId(prod.carpenterId || '');
      setCarpenterLabourRate(prod.carpenterLabourRate !== undefined ? prod.carpenterLabourRate : '');
      setCarpenterDeliveryDate(prod.carpenterDeliveryDate || '');
      setPolishPersonId(prod.polishPersonId || '');
      setPolishLabourRate(prod.polishLabourRate !== undefined ? prod.polishLabourRate : '');
      setPolishDeliveryDate(prod.polishDeliveryDate || '');
    }
  };

  const handleSelectCarpenter = (cId: string) => {
    setCarpenterId(cId);
    if (productsList.length > 0) {
      setProductsList((prev) =>
        prev.map((p, idx) => (idx === activeProductIndex ? { ...p, carpenterId: cId } : p))
      );
    }
  };

  const handleChangeCarpenterLabourRate = (rate: number | '') => {
    setCarpenterLabourRate(rate);
    if (productsList.length > 0) {
      setProductsList((prev) =>
        prev.map((p, idx) => (idx === activeProductIndex ? { ...p, carpenterLabourRate: rate } : p))
      );
    }
  };

  const handleChangeCarpenterDeliveryDate = (dateStr: string) => {
    setCarpenterDeliveryDate(dateStr);
    if (productsList.length > 0) {
      setProductsList((prev) =>
        prev.map((p, idx) => (idx === activeProductIndex ? { ...p, carpenterDeliveryDate: dateStr } : p))
      );
    }
  };

  const handleSelectPolish = (pId: string) => {
    setPolishPersonId(pId);
    if (productsList.length > 0) {
      setProductsList((prev) =>
        prev.map((p, idx) => (idx === activeProductIndex ? { ...p, polishPersonId: pId } : p))
      );
    }
  };

  const handleChangePolishLabourRate = (rate: number | '') => {
    setPolishLabourRate(rate);
    if (productsList.length > 0) {
      setProductsList((prev) =>
        prev.map((p, idx) => (idx === activeProductIndex ? { ...p, polishLabourRate: rate } : p))
      );
    }
  };

  const handleChangePolishDeliveryDate = (dateStr: string) => {
    setPolishDeliveryDate(dateStr);
    if (productsList.length > 0) {
      setProductsList((prev) =>
        prev.map((p, idx) => (idx === activeProductIndex ? { ...p, polishDeliveryDate: dateStr } : p))
      );
    }
  };

  // --- STEP 5: REVIEW STATE ---
  const [orderDate, setOrderDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = React.useState(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // today + 10 days
  );
  const [priority, setPriority] = React.useState<OrderPriority>('normal');
  const [internalNotes, setInternalNotes] = React.useState('');

  // Article Number Preview calculation
  const [articlePreview, setArticlePreview] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const activeProd = productsList[activeProductIndex];
    const catToUse = activeProd ? activeProd.category : category;
    const carpToUse = activeProd ? activeProd.carpenterId : carpenterId;

    if (carpToUse) {
      const offset = productsList.length > 0 ? activeProductIndex : 0;
      const generated = generateArticleNumber(catToUse, carpToUse, orders, users, offset);
      setArticlePreview(generated);
    }
  }, [category, carpenterId, activeProductIndex, productsList, orders, users]);

  // Customer filtration
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchCustQuery.toLowerCase()) ||
    c.phone.includes(searchCustQuery)
  );

  const selectExistingCustomer = (c: Customer) => {
    setSelectedCustId(c.id);
    setIsNewCust(false);
    setCustName(c.name);
    setCustPhone(c.phone);
    setCustAddress(c.address || '');
    setCustNotes(c.notes || '');
    setWhatsappOptIn(c.whatsapp_opt_in);
  };

  const startNewCustomer = () => {
    setSelectedCustId(null);
    setIsNewCust(true);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setCustNotes('');
    setWhatsappOptIn(true);
  };

  const handleAddImageUrl = () => {
    if (imgUrlInput && imgUrlInput.startsWith('http')) {
      setRefImages([...refImages, { id: generateUUID(), url: imgUrlInput, type: 'Design Reference' }]);
      setImgUrlInput('');
    } else {
      alert('Please enter a valid HTTP/HTTPS image path URL.');
    }
  };

  const handleRemoveImage = (id: string) => {
    setRefImages(refImages.filter((img) => img.id !== id));
  };

  React.useEffect(() => {
    if (initialDraft) {
      if (initialDraft.category) setCategory(initialDraft.category);
      if (initialDraft.subCategory) setSubCategory(initialDraft.subCategory);
      if (initialDraft.size) setSize(initialDraft.size);
      if (initialDraft.customSize) setCustomSize(initialDraft.customSize);
      if (initialDraft.designType) setDesignType(initialDraft.designType);
      if (initialDraft.material) setMaterial(initialDraft.material);
      if (initialDraft.finish) setFinish(initialDraft.finish);
      if (initialDraft.colorShade) setColorShade(initialDraft.colorShade);
      if (initialDraft.qty) setNoOfUnits(initialDraft.qty);
      if (initialDraft.specialNotes) setSpecialNotes(initialDraft.specialNotes);
      if (initialDraft.refImages) setRefImages(initialDraft.refImages);

      // Customer
      const draftPhone = initialDraft.whatsappNo?.trim();
      const draftName = initialDraft.customerName?.trim();

      const matchingCust = customers.find((c) => {
        if (!draftName || !c.name) return false;

        const nameMatches = c.name.toLowerCase() === draftName.toLowerCase();
        const phoneMatches = draftPhone && c.phone && c.phone.trim() === draftPhone;

        if (phoneMatches) {
          const cNameLower = c.name.toLowerCase();
          const dNameLower = draftName.toLowerCase();
          const nameIsSimilar = 
            cNameLower.includes(dNameLower) || 
            dNameLower.includes(cNameLower) ||
            cNameLower.split(' ')[0] === dNameLower.split(' ')[0];
          
          return nameIsSimilar;
        }

        return nameMatches;
      });

      if (matchingCust) {
        setSelectedCustId(matchingCust.id);
        setIsNewCust(false);
        setCustName(matchingCust.name);
        setCustPhone(matchingCust.phone);
        setCustAddress(matchingCust.address || '');
      } else {
        setSelectedCustId(null);
        setIsNewCust(true);
        setCustName(initialDraft.customerName || '');
        setCustPhone(initialDraft.whatsappNo || '');
        setCustAddress(initialDraft.address || '');
      }

      // Populate multi-product items list for workshop delegation tabs
      const defaultCarpenter = activeCarpenters[0]?.id || '';
      const defaultPolish = activePolish[0]?.id || '';
      const defaultCarpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const defaultPolDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let initialProds: Array<{
        id: string;
        productName: string;
        category: string;
        subCategory: string;
        size: string;
        customSize?: string;
        designType: 'Standard' | 'Custom';
        material: string;
        finish: string;
        colorShade: string;
        qty: number;
        specialNotes?: string;
        quotedRate?: number;
        cushion?: number;
        discount?: number;
        hardware?: number;
        finalRate?: number;
        amount?: number;
        refImages?: Array<{ id: string; url: string; type: 'Design Reference' }>;
        carpenterId: string;
        carpenterLabourRate: number | '';
        carpenterDeliveryDate: string;
        polishPersonId: string;
        polishLabourRate: number | '';
        polishDeliveryDate: string;
      }> = [];

      if (Array.isArray(initialDraft.items) && initialDraft.items.length > 0) {
        initialProds = initialDraft.items.map((it: any, idx: number) => {
          const pName = it.productName || it.subCategory || it.category || `Product #${idx + 1}`;
          return {
            id: it.id || `item_${idx + 1}_` + generateUUID().split('-')[0],
            productName: pName,
            category: it.category || initialDraft.category || 'Door Frames',
            subCategory: it.subCategory || initialDraft.subCategory || 'Set',
            size: it.size || initialDraft.size || '6ft',
            customSize: it.customSize || initialDraft.customSize || '',
            designType: it.designType || initialDraft.designType || 'Standard',
            material: it.material || initialDraft.material || 'Plywood',
            finish: it.finish || initialDraft.finish || 'hand polish',
            colorShade: it.colorShade || initialDraft.colorShade || 'Walnut',
            qty: it.qty || it.noOfUnits || 1,
            specialNotes: it.specialNotes || initialDraft.specialNotes || '',
            quotedRate: it.quotedRate,
            cushion: it.cushion,
            discount: it.discount,
            hardware: it.hardware,
            finalRate: it.finalRate,
            amount: it.amount,
            refImages: it.refImages || initialDraft.refImages || [],
            carpenterId: it.carpenterId || defaultCarpenter,
            carpenterLabourRate: it.carpenterLabourRate !== undefined ? it.carpenterLabourRate : '',
            carpenterDeliveryDate: it.carpenterDeliveryDate || defaultCarpDate,
            polishPersonId: it.polishPersonId || defaultPolish,
            polishLabourRate: it.polishLabourRate !== undefined ? it.polishLabourRate : '',
            polishDeliveryDate: it.polishDeliveryDate || defaultPolDate,
          };
        });
      } else {
        const pName = initialDraft.productName || initialDraft.subCategory || initialDraft.category || 'Product #1';
        initialProds = [
          {
            id: 'item_1_' + generateUUID().split('-')[0],
            productName: pName,
            category: initialDraft.category || 'Door Frames',
            subCategory: initialDraft.subCategory || 'Set',
            size: initialDraft.size || '6ft',
            customSize: initialDraft.customSize || '',
            designType: initialDraft.designType || 'Standard',
            material: initialDraft.material || 'Plywood',
            finish: initialDraft.finish || 'hand polish',
            colorShade: initialDraft.colorShade || 'Walnut',
            qty: initialDraft.qty || 1,
            specialNotes: initialDraft.specialNotes || '',
            refImages: initialDraft.refImages || [],
            carpenterId: defaultCarpenter,
            carpenterLabourRate: '',
            carpenterDeliveryDate: defaultCarpDate,
            polishPersonId: defaultPolish,
            polishLabourRate: '',
            polishDeliveryDate: defaultPolDate,
          },
        ];
      }

      setProductsList(initialProds);
      setActiveProductIndex(0);
      if (initialProds[0]) {
        setCarpenterId(initialProds[0].carpenterId);
        setCarpenterLabourRate(initialProds[0].carpenterLabourRate);
        setCarpenterDeliveryDate(initialProds[0].carpenterDeliveryDate);
        setPolishPersonId(initialProds[0].polishPersonId);
        setPolishLabourRate(initialProds[0].polishLabourRate);
        setPolishDeliveryDate(initialProds[0].polishDeliveryDate);
      }

      // Rates & Polishing details can be set in internalNotes
      let noteLines = [];
      if (initialDraft.polishShade) noteLines.push(`Polish Shade: ${initialDraft.polishShade}`);
      if (initialDraft.paymentMode) noteLines.push(`Payment Mode: ${initialDraft.paymentMode}`);
      if (initialDraft.typeOfPolish) noteLines.push(`Polish Application: ${initialDraft.typeOfPolish}`);
      if (noteLines.length > 0) {
        setInternalNotes(noteLines.join('\n'));
      }

      setStep(4); // Start directly at Step 4: Assignment (Carpenter/Polish)
    }
  }, [initialDraft, customers]);

  // Step Nav validation
  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      if (size === 'Custom' && !customSize) {
        alert('Please specify the dimensions for your Custom furniture size.');
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (!custName.trim() || !custPhone.trim()) {
        alert('Customer Name and active Phone Number are required fields.');
        return false;
      }
      return true;
    }
    if (currentStep === 4) {
      if (productsList.length > 0) {
        const unassignedIdx = productsList.findIndex((p) => !p.carpenterId);
        if (unassignedIdx !== -1) {
          const unassignedItem = productsList[unassignedIdx];
          alert(`Please select a primary carpenter for product "${unassignedItem.productName || unassignedItem.subCategory || (unassignedIdx + 1)}".`);
          handleSelectProductTab(unassignedIdx);
          return false;
        }
      } else if (!carpenterId) {
        alert('A dedicated carpenter is required in order to save the production line order.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    setStep(step - 1);
  };

  const handleCopyArticle = () => {
    navigator.clipboard.writeText(articlePreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    let targetCustomerId = selectedCustId || '';

    // Create customer profile if selected as new
    let newCustomerObj: Customer | undefined;
    if (isNewCust || !selectedCustId) {
      const generatedCustId = 'cust_' + generateUUID().split('-')[0];
      newCustomerObj = {
        id: generatedCustId,
        name: custName,
        phone: custPhone,
        address: custAddress,
        notes: custNotes,
        whatsapp_opt_in: whatsappOptIn,
        created_at: new Date().toISOString(),
        created_by: 'user_admin',
      };
      targetCustomerId = generatedCustId;
    }

    const draftFinalRate = initialDraft ? (Number(initialDraft.finalRate) || 0) : 0;
    const draftQty = initialDraft ? (Number(initialDraft.qty) || 1) : 1;
    const draftPacking = initialDraft ? (Number(initialDraft.packingForwarding) || 0) : 0;
    const draftTransportation = initialDraft ? (Number(initialDraft.transportation) || 0) : 0;
    const draftAdvance = initialDraft ? (Number(initialDraft.advance) || 0) : 0;
    const draftTotalInvoiced = initialDraft ? ((draftFinalRate * draftQty) + draftPacking + draftTransportation) : undefined;
    const draftAdvancePaid = initialDraft ? draftAdvance : undefined;

    let baseOrderId = '';
    let orderSequence = 1;

    if (initialDraft && initialDraft.orderNo && initialDraft.orderNo !== 'Generated when order is saved') {
      baseOrderId = initialDraft.orderNo;
      orderSequence = parseParentOrderSequence(baseOrderId);
    } else {
      const generated = await generateNextParentOrderId();
      baseOrderId = generated.parentOrderId;
      orderSequence = generated.orderSequence;
    }

    const listToSave = productsList.length > 0 ? productsList : [
      {
        id: generateUUID(),
        productName: subCategory || category,
        category,
        subCategory,
        size,
        customSize,
        designType,
        material,
        finish,
        colorShade,
        qty: noOfUnits,
        specialNotes,
        refImages,
        carpenterId,
        carpenterLabourRate,
        carpenterDeliveryDate,
        polishPersonId,
        polishLabourRate,
        polishDeliveryDate,
      }
    ];

    const createdOrders: Order[] = [];

    listToSave.forEach((prod, idx) => {
      const orderId = listToSave.length > 1 ? `${baseOrderId}-${idx + 1}` : baseOrderId;
      const artNo = generateArticleNumber(
        prod.category || category,
        prod.carpenterId || carpenterId,
        orders,
        users,
        idx
      );

      const newOrder: Order = {
        id: orderId,
        parent_order_id: baseOrderId,
        order_sequence: orderSequence,
        article_no: artNo,
        customer_id: targetCustomerId,
        category: prod.category || category,
        sub_category: prod.subCategory || subCategory,
        size: prod.size || size,
        custom_size: (prod.size || size) === 'Custom' ? (prod.customSize || customSize) : undefined,
        design_type: prod.designType || designType,
        material: prod.material || material,
        finish: prod.finish || finish,
        color_shade: prod.colorShade || colorShade,
        no_of_units: prod.qty || noOfUnits,
        carpenter_id: prod.carpenterId || carpenterId,
        carpenter_labour_rate: prod.carpenterLabourRate !== '' ? Number(prod.carpenterLabourRate) : undefined,
        carpenter_delivery_date: prod.carpenterDeliveryDate || carpenterDeliveryDate,
        polish_person_id: prod.polishPersonId || polishPersonId || undefined,
        polish_labour_rate: prod.polishLabourRate !== '' ? Number(prod.polishLabourRate) : undefined,
        polish_delivery_date: prod.polishPersonId ? (prod.polishDeliveryDate || polishDeliveryDate) : undefined,
        current_status: 'Design',
        is_delayed: false,
        priority,
        order_date: orderDate,
        delivery_date: deliveryDate,
        internal_notes: internalNotes || undefined,
        special_notes: prod.specialNotes || specialNotes || undefined,
        portal_token: 'pt_' + generateUUID().split('-')[0],
        portal_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        qr_token: 'qr_' + generateUUID().split('-')[0],
        created_at: new Date().toISOString(),
        created_by: 'user_admin',
        images: (prod.refImages && prod.refImages.length > 0 ? prod.refImages : refImages).map((img) => ({
          id: img.id,
          url: img.url,
          type: 'Design Reference',
          uploaded_at: new Date().toISOString(),
          uploaded_by: 'user_admin',
        })),
        total_amount: prod.amount || (prod.finalRate ? prod.finalRate * prod.qty : draftTotalInvoiced),
        advance_paid: idx === 0 ? draftAdvancePaid : 0,
      };

      createdOrders.push(newOrder);
    });

    onSave(createdOrders, newCustomerObj);
  };

  return (
    <div className="space-y-6">
      {/* Page Header Area */}
      <div>
        <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight">Create New Order</h1>
        <p className="text-stone-500 text-xs mt-1">Register customer specifications, upload blueprint drawings and delegate workshop staff</p>
      </div>

      {/* Modern Stepper Process Indicator */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs max-w-5xl mx-auto flex items-center justify-between font-mono text-[11px] font-bold text-stone-400">
        {[
          { num: 1, name: 'Product' },
          { num: 2, name: 'Customer' },
          { num: 3, name: 'Images' },
          { num: 4, name: 'Assign' },
          { num: 5, name: 'Review' },
        ].map((item) => {
          const isActive = step === item.num;
          const isDone = step > item.num;
          return (
            <React.Fragment key={item.num}>
              <div className="flex items-center gap-2">
                <span
                  className={`h-6 w-6 rounded-full flex items-center justify-center border font-black ${
                    isActive
                      ? 'bg-[#593622] text-amber-300 border-amber-500 shadow-md ring-4 ring-amber-500/10'
                      : isDone
                      ? 'bg-green-600 text-white border-green-750'
                      : 'bg-stone-50 text-stone-400 border-stone-200'
                  }`}
                >
                  {item.num}
                </span>
                <span className={isActive ? 'text-stone-900 font-black font-sans' : 'text-stone-400 font-sans'}>
                  {item.name}
                </span>
              </div>
              {item.num < 5 && <div className={`flex-1 h-[2px] mx-4 max-w-[80px] hidden sm:block ${isDone ? 'bg-green-600' : 'bg-stone-100'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto items-start">
        {/* Left main form sections (depending on active step) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          
          {/* STEP 1: PRODUCT PROPERTIES */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100 pb-2">
                1. Product Configuration
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      setCategory(newCategory);
                      const validSubs = CATEGORY_MAP[newCategory] || [];
                      if (validSubs.length > 0) {
                        setSubCategory(validSubs[0]);
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none focus:ring-0 text-stone-700 font-semibold"
                  >
                    {Object.keys(CATEGORY_MAP).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Sub-category *</label>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none focus:ring-0 text-stone-700 font-semibold"
                  >
                    {(CATEGORY_MAP[category] || []).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Size *</label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none focus:ring-0 text-stone-700 font-semibold"
                  >
                    <option>3ft</option>
                    <option>4ft</option>
                    <option>6ft</option>
                    <option>Custom</option>
                  </select>
                </div>

                {size === 'Custom' && (
                  <div>
                    <label className="block text-xs font-bold text-stone-750 mb-1.5 uppercase tracking-wide text-rose-700 animate-pulse">Custom Size Details *</label>
                    <input
                      type="text"
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      placeholder="e.g. Height 75in x Width 72in x Depth 24in"
                      className="w-full px-3 py-2.5 bg-rose-50/20 border border-rose-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none text-stone-800 font-semibold placeholder:text-stone-400"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wide font-sans">Design Type *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDesignType('Standard')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        designType === 'Standard'
                          ? 'bg-[#fcf8f2] text-amber-900 border-amber-300 shadow-sm'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Standard Catalog
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesignType('Custom')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        designType === 'Custom'
                          ? 'bg-[#fcf8f2] text-amber-900 border-amber-300 shadow-sm'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Bespoke/Custom Design
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Material Structure *</label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none focus:ring-0 text-stone-700 font-semibold"
                  >
                    <option>Plywood</option>
                    <option>Sagwan</option>
                    <option>Shivan</option>
                    <option>Aakashi</option>
                    <option>Other Wood</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Finish Type *</label>
                  <select
                    value={finish}
                    onChange={(e) => setFinish(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none focus:ring-0 text-stone-700 font-semibold"
                  >
                    <option>hand polish</option>
                    <option>matt</option>
                    <option>glossy</option>
                    <option>mix matt</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Color / Shade *</label>
                  <select
                    value={colorShade}
                    onChange={(e) => setColorShade(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none focus:ring-0 text-[#292524] font-semibold"
                  >
                    <option>Walnut Textures</option>
                    <option>Teak Finish</option>
                    <option>Charcoal Slate</option>
                    <option>Teak Accent</option>
                    <option>Mahogany Matte</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">No. of Units *</label>
                <div className="inline-flex items-center gap-1.5 border border-stone-250 bg-stone-50 rounded-xl p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setNoOfUnits(Math.max(1, noOfUnits - 1))}
                    className="p-1 px-2 text-stone-500 hover:text-stone-900 font-black"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="font-mono text-xs font-black px-4">{noOfUnits}</span>
                  <button
                    type="button"
                    onClick={() => setNoOfUnits(noOfUnits + 1)}
                    className="p-1 px-2 text-stone-500 hover:text-stone-900 font-black"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Special Instructions / Note</label>
                <textarea
                  rows={3}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Soft close hinges, internal hidden key drawer, glass cabinet profiles..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none placeholder:text-stone-400 font-semibold"
                />
              </div>
            </div>
          )}

          {/* STEP 2: CUSTOMER DIRECTORIES */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                  2. Customer Specifications
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startNewCustomer}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                      isNewCust
                        ? 'bg-[#593622] text-amber-300 border-amber-600'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <UserPlus size={13} /> New Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewCust(false)}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                      !isNewCust
                        ? 'bg-[#593622] text-amber-300 border-amber-600'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Search size={13} /> Lookup Existing
                  </button>
                </div>
              </div>

              {!isNewCust && (
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-stone-400" size={14} />
                    <input
                      type="text"
                      value={searchCustQuery}
                      onChange={(e) => setSearchCustQuery(e.target.value)}
                      placeholder="Search existing customers by name or telephone..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-250 focus:border-[#593622] focus:outline-none rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1 bg-stone-100 p-1.5 rounded-lg border border-stone-200">
                    <p className="text-[10px] uppercase font-mono font-bold text-stone-400 px-2.5 py-1">CUSTOMER DIRECTORY MATCHES</p>
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectExistingCustomer(c)}
                        className={`w-full flex justify-between items-center text-left p-2 rounded hover:bg-stone-50 text-xs font-bold transition ${
                          selectedCustId === c.id ? 'bg-amber-100 text-[#593622]' : 'text-stone-750'
                        }`}
                      >
                        <div>
                          <span>{c.name}</span>
                          <span className="font-mono text-stone-400 text-[10px] block font-normal">{c.phone}</span>
                        </div>
                        {selectedCustId === c.id && <Check size={14} className="text-amber-700" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl space-y-4">
                <p className="text-xs font-bold text-[#593622] uppercase tracking-wider">
                  {isNewCust ? '★ Fill New Customer Details' : '★ Customer Information Details'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="Rahul Deshmukh"
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-[#593622] focus:outline-none rounded-xl text-xs font-semibold text-stone-850"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Phone Number (WhatsApp notifications) *</label>
                    <input
                      type="text"
                      required
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-[#593622] focus:outline-none rounded-xl text-xs font-semibold text-stone-850"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Delivery Address</label>
                  <textarea
                    rows={2}
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="Enter complete shipping coordinates for final dispatch..."
                    className="w-full p-3 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none font-semibold text-stone-850"
                  />
                </div>

                <div className="flex items-center gap-2 select-none border-t border-stone-100 pt-3">
                  <input
                    type="checkbox"
                    id="whatsappConsent"
                    checked={whatsappOptIn}
                    onChange={() => setWhatsappOptIn(!whatsappOptIn)}
                    className="h-4 w-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                  />
                  <label htmlFor="whatsappConsent" className="text-xs font-sans text-stone-600">
                    <strong>Send WhatsApp Updates</strong> (Sends live production progression reports when transitioning to dispatch/delivery stage)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BLUEPRINTS IMAGES */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100 pb-2">
                3. Design Reference Drawings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File Upload card */}
                <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 flex flex-col justify-between space-y-4 min-h-[190px]">
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block mb-1">LOCAL FILE INTEGRATION</span>
                    <h3 className="text-xs font-black text-[#593622] uppercase tracking-wider">Device Gallery or File Manager</h3>
                    <p className="text-[11px] text-stone-500 leading-normal mt-1">Select and attach existing custom workshop sketch designs or hand-drafted blueprint files from your device memory.</p>
                  </div>

                  <div className="space-y-2">
                    {/* PC File Upload Button */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="flex-1 bg-white border border-stone-300 rounded-xl p-2.5 flex items-center justify-center gap-2 hover:border-[#593622] hover:bg-stone-50 cursor-pointer shadow-2xs font-extrabold text-[11px] text-stone-800 transition">
                        <UploadCloud size={14} className="text-[#593622]" />
                        <span>Browse local photos</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleLocalFileUpload}
                          className="hidden"
                        />
                      </label>
                      
                      {/* Native Mobile Camera direct trigger */}
                      <label className="flex-1 bg-[#593622] text-white rounded-xl p-2.5 flex items-center justify-center gap-2 hover:bg-[#402414] cursor-pointer shadow-2xs font-black uppercase text-[11px] tracking-wider transition">
                        <Camera size={14} />
                        <span>Mobile Camera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleLocalFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-center text-[10px] text-stone-400">Drag &amp; drop anywhere into this box to upload direct formats</p>
                  </div>
                </div>

                {/* Webcam Card */}
                <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 flex flex-col justify-between space-y-4 min-h-[190px]">
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block mb-1">REAL-TIME WORKSHOP CAPTURE</span>
                    <h3 className="text-xs font-black text-[#593622] uppercase tracking-wider">Live Document Scanner</h3>
                    <p className="text-[11px] text-stone-500 leading-normal mt-1">Instantly take live snapshots of raw catalog pages, layout requests, or custom woodwork orders using your current screen camera.</p>
                  </div>

                  {!isWebcamActive ? (
                    <button
                      type="button"
                      onClick={startWebcam}
                      className="bg-[#593622]/10 border border-[#593622]/30 text-[#593622] hover:bg-[#593622]/20 font-black uppercase text-[11px] tracking-wider p-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-3xs"
                    >
                      <Video size={14} />
                      <span>Start Live Viewfinder</span>
                    </button>
                  ) : (
                    <div className="bg-stone-900 rounded-xl overflow-hidden relative border border-stone-950 aspect-video flex flex-col justify-between">
                      {webcamError ? (
                        <div className="p-3 text-[10px] text-red-400 leading-relaxed font-bold flex flex-col items-center justify-center h-full text-center">
                          <span>{webcamError}</span>
                          <button
                            type="button"
                            onClick={stopWebcam}
                            className="mt-2 p-1 px-3 bg-white text-stone-900 rounded-lg text-[9px] uppercase font-black"
                          >
                            Close stream
                          </button>
                        </div>
                      ) : (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="absolute inset-0 object-cover w-full h-full scale-x-[-1]"
                          />
                          <div className="absolute top-2 right-2 bg-black/60 p-0.5 px-2 rounded-md font-mono text-[9px] text-stone-300 font-bold tracking-widest animate-pulse select-none flex items-center gap-1">
                            <span className="h-1.5 w-1.5 bg-red-600 rounded-full inline-block" /> LIVE CAM
                          </div>
                          <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                            <button
                              type="button"
                              onClick={captureSnapshot}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg font-black uppercase text-[10px] tracking-wider shadow"
                            >
                              📸 Take Snapshot
                            </button>
                            <button
                              type="button"
                              onClick={stopWebcam}
                              className="bg-red-700 hover:bg-red-800 text-white p-1.5 px-3 rounded-lg font-bold text-[10px] uppercase shadow"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible presets and manual url paste */}
              <details className="group bg-stone-100 border border-stone-250/70 rounded-xl overflow-hidden font-sans text-xs">
                <summary className="p-3 font-extrabold text-stone-600 hover:text-[#593622] cursor-pointer select-none flex items-center justify-between text-[11px] uppercase tracking-wide">
                  <span>🔗 Or paste internet photo path &amp; catalog presets</span>
                  <span className="font-sans text-stone-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                
                <div className="p-4 bg-stone-50 border-t space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imgUrlInput}
                      onChange={(e) => setImgUrlInput(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-1 px-3 py-2 bg-white border border-stone-250 rounded-lg text-xs focus:border-[#593622] focus:outline-none font-semibold text-stone-850"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="bg-[#593622] text-white hover:bg-[#402414] px-4 py-2 font-bold text-xs rounded-lg shadow transition shrink-0"
                    >
                      Add URL
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap text-stone-500 font-bold text-[10px]">
                    <span className="bg-stone-200 p-1 px-2.5 rounded text-stone-800 border border-stone-300">Catalog Presets:</span>
                    {FURNITURE_PHOTOS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRefImages([...refImages, { id: generateUUID(), url: p, type: 'Design Reference' }])}
                        className="bg-white border rounded px-2.5 py-1 hover:border-amber-500 font-bold text-stone-800 shadow-3xs transition-all"
                      >
                        Wardrobe Preset {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </details>

              {/* Grid or Empty layout previews */}
              {refImages.length > 0 ? (
                <div className="mt-2 space-y-2">
                  <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider select-none">Active Blueprint Drawings ({refImages.length})</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {refImages.map((img) => (
                      <div key={img.id} className="relative group rounded-xl overflow-hidden border border-stone-200 aspect-video shadow-xs bg-stone-100">
                        <img referrerPolicy="no-referrer" src={img.url} alt="Reference" className="object-cover w-full h-full" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(img.id)}
                            className="bg-[#b91c1c] text-white p-2 rounded-xl transition hover:scale-105"
                            title="Remove layout file"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-10 border-2 border-dashed border-stone-300 rounded-2xl flex flex-col items-center justify-center text-stone-400">
                  <ImageIcon size={32} className="text-stone-300 mb-2 animate-pulse" />
                  <p className="text-xs font-bold text-stone-500">No layout blueprints or photos added</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Capture with camera, upload local drawings, or click standard templates above.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: WORKSHOP DELEGATE */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-stone-100 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                  4. Delegate Workshop Staff
                </h2>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Assign primary carpenter and polish person independently for each product in this order.
                </p>
              </div>

              {/* Product Tab Navigation */}
              {productsList.length > 0 && (
                <div className="bg-amber-50/40 p-3.5 rounded-2xl border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#593622] uppercase tracking-wider flex items-center gap-1.5">
                      ★ Select Product Line Item ({productsList.length} Total)
                    </span>
                    <span className="text-[10px] text-stone-500 font-semibold hidden sm:inline">
                      Click tab to switch assignment per product
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {productsList.map((prod, idx) => {
                      const isSelected = idx === activeProductIndex;
                      const carpUser = activeCarpenters.find((u) => u.id === prod.carpenterId);
                      const polUser = activePolish.find((u) => u.id === prod.polishPersonId);

                      return (
                        <button
                          key={prod.id || idx}
                          type="button"
                          onClick={() => handleSelectProductTab(idx)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-[#593622] text-white border-[#593622] shadow-sm ring-2 ring-[#593622]/20'
                              : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                          }`}
                        >
                          <span
                            className={`h-5 w-5 rounded-lg text-[10px] flex items-center justify-center font-mono font-black ${
                              isSelected ? 'bg-amber-300 text-[#593622]' : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="text-left">
                            <div className="font-bold leading-tight truncate max-w-[160px]">
                              {prod.productName || prod.subCategory || prod.category} ({prod.qty}x)
                            </div>
                            <div
                              className={`text-[9.5px] font-medium leading-tight mt-0.5 ${
                                isSelected ? 'text-amber-200' : 'text-stone-400'
                              }`}
                            >
                              Carp: {carpUser ? carpUser.name.split(' ')[0] : 'None'} | Pol: {polUser ? polUser.name.split(' ')[0] : 'None'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Carpenter Selector */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-[#593622] uppercase tracking-wider block">★ Select Primary Carpenter *</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeCarpenters.map((carp) => {
                    const workload = getWorkload(carp.id);
                    const activeProd = productsList[activeProductIndex];
                    const isSelected = activeProd ? activeProd.carpenterId === carp.id : carpenterId === carp.id;
                    return (
                      <label
                        key={carp.id}
                        onClick={() => handleSelectCarpenter(carp.id)}
                        className={`border rounded-xl p-3 flex justify-between items-center cursor-pointer transition shadow-xs ${
                          isSelected
                            ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/15 text-[#593622]'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name={`carpenterGroup_${activeProductIndex}`}
                            checked={isSelected}
                            onChange={() => handleSelectCarpenter(carp.id)}
                            className="text-amber-600 focus:ring-amber-500 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-xs text-stone-850 block">{carp.name}</span>
                            <span className="text-[10px] text-stone-400 font-mono tracking-wider font-semibold block uppercase">Initials: {carp.initials}</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-stone-150 text-stone-600 font-mono px-2 py-0.5 rounded font-black">
                          {workload} active orders
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Labour Rate Input and Delivery Date for selected Carpenter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mt-3 animate-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">
                      Carpenter Labour Rate (₹)
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-stone-400 text-xs font-semibold">₹</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={productsList[activeProductIndex]?.carpenterLabourRate ?? carpenterLabourRate}
                        onChange={(e) => handleChangeCarpenterLabourRate(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Enter carpenter labour rate"
                        className="w-full pl-7 pr-3 py-2 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none focus:ring-0 text-stone-700 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">
                      Carpenter Delivery Date
                    </label>
                    <input
                      type="date"
                      value={productsList[activeProductIndex]?.carpenterDeliveryDate ?? carpenterDeliveryDate}
                      onChange={(e) => handleChangeCarpenterDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none focus:ring-0 text-stone-700 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Polish Person Selector */}
              <div className="space-y-3 pt-3 border-t border-stone-100">
                <p className="text-xs font-bold text-[#593622] uppercase tracking-wider block">★ Select Primary Polish Person</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activePolish.map((pol) => {
                    const workload = getWorkload(pol.id);
                    const activeProd = productsList[activeProductIndex];
                    const isSelected = activeProd ? activeProd.polishPersonId === pol.id : polishPersonId === pol.id;
                    return (
                      <label
                        key={pol.id}
                        onClick={() => handleSelectPolish(pol.id)}
                        className={`border rounded-xl p-3 flex justify-between items-center cursor-pointer transition shadow-xs ${
                          isSelected
                            ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/15 text-[#593622]'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name={`polishGroup_${activeProductIndex}`}
                            checked={isSelected}
                            onChange={() => handleSelectPolish(pol.id)}
                            className="text-amber-600 focus:ring-amber-500 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-xs text-stone-850 block">{pol.name}</span>
                            <span className="text-[10px] text-stone-400 font-mono tracking-wider font-semibold block uppercase">Initials: {pol.initials}</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-stone-150 text-stone-600 font-mono px-2 py-0.5 rounded font-black">
                          {workload} active orders
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Labour Rate Input and Delivery Date for selected Polish Person */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mt-3 animate-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">
                      Polish Person Labour Rate (₹)
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-stone-400 text-xs font-semibold">₹</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={productsList[activeProductIndex]?.polishLabourRate ?? polishLabourRate}
                        onChange={(e) => handleChangePolishLabourRate(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Enter polish person labour rate"
                        className="w-full pl-7 pr-3 py-2 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none focus:ring-0 text-stone-700 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">
                      Polish Person Delivery Date
                    </label>
                    <input
                      type="date"
                      value={productsList[activeProductIndex]?.polishDeliveryDate ?? polishDeliveryDate}
                      onChange={(e) => handleChangePolishDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none focus:ring-0 text-stone-700 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & DATE CHECKS */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100 pb-2">
                5. Review & SAVE Order Line
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Date of Order *</label>
                  <input
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#593622] rounded-xl text-xs font-semibold text-stone-850"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wide">Date of Delivery *</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#593622] rounded-xl text-xs font-semibold text-stone-850"
                  />
                </div>
              </div>

              <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-4 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#593622]">Workshop Staff Delivery Schedule</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white border border-stone-150 p-2.5 rounded-lg flex flex-col justify-center">
                    <span className="text-stone-500 text-[10px] uppercase font-bold">Carpenter Delivery Date</span>
                    <strong className="text-stone-800 mt-0.5">{carpenterDeliveryDate}</strong>
                  </div>
                  <div className="bg-white border border-stone-150 p-2.5 rounded-lg flex flex-col justify-center">
                    <span className="text-stone-500 text-[10px] uppercase font-bold">Polish Person Delivery Date</span>
                    <strong className="text-stone-800 mt-0.5">{polishPersonId ? polishDeliveryDate : 'Not delegated'}</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wide font-sans">Order Priority Level</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                      priority === 'normal'
                        ? 'bg-stone-100 text-stone-800 border-stone-300'
                        : 'bg-stone-50 text-stone-500 border-stone-200'
                    }`}
                  >
                    Normal Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('urgent')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                      priority === 'urgent'
                        ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm animate-pulse'
                        : 'bg-stone-50 text-stone-500 border-stone-200'
                    }`}
                  >
                    ★ Urgent / Express Delivery
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#593622] mb-1.5 uppercase tracking-wide">Internal Notes (Admin Only view)</label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Private comments, production codes, inventory checks..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none placeholder:text-stone-400 font-semibold"
                />
              </div>
            </div>
          )}

          {/* Wizard Action sticky-like bottom bar layout */}
          <div className="flex justify-between items-center pt-5 border-t border-stone-100 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500 hover:text-stone-800 text-xs font-bold hover:bg-stone-50 transition"
            >
              Cancel
            </button>

            <div className="flex gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-1.5 px-3.5 py-2 border border-stone-250 rounded-xl text-stone-600 hover:text-stone-900 text-xs font-bold hover:bg-stone-50 transition"
                >
                  <ChevronLeft size={13} /> Back
                </button>
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1 bg-[#593622] hover:bg-[#402414] text-white px-4 py-2 font-bold text-xs rounded-xl shadow transition"
                >
                  Next Step <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFormSubmission}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 font-black text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  Save & Register Order
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Right side static "Article Number Preview" card */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-5">
          <div className="border border-amber-300 bg-[#fefdfa] p-4 rounded-xl space-y-2 text-center relative overflow-hidden">
            <span className="text-[9px] font-mono tracking-wider text-amber-900 font-bold uppercase block">Article Number Preview</span>
            <div className="flex items-center justify-center gap-1.5 py-1">
              <strong className="font-mono text-base tracking-widest text-[#593622]">{articlePreview || 'CAT-YYMM-XX-0001'}</strong>
              <button
                type="button"
                onClick={handleCopyArticle}
                className="text-stone-400 hover:text-stone-700 p-1"
                title="Copy code"
              >
                {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              </button>
            </div>
            <span className="text-[9px] text-stone-400 uppercase tracking-widest block font-bold font-sans">Category-YYMM-Initials-Serial (Auto generated)</span>
          </div>

          {/* Dynamic Order Summary card */}
          <div className="rounded-xl border border-stone-150 bg-stone-50/50 p-4 space-y-3 text-xs leading-relaxed">
            <div className="flex items-center justify-between border-b border-stone-150 pb-1.5">
              <p className="font-bold text-stone-800 uppercase tracking-wide">Order Summary</p>
              {productsList.length > 1 && (
                <span className="text-[10px] text-[#593622] font-black bg-amber-100/80 px-2 py-0.5 rounded-md">
                  Item {activeProductIndex + 1} of {productsList.length}
                </span>
              )}
            </div>

            {(() => {
              const cur = productsList[activeProductIndex];
              const displayCat = cur ? cur.category : category;
              const displaySub = cur ? cur.subCategory : subCategory;
              const displaySize = cur ? (cur.size === 'Custom' ? (cur.customSize || 'Custom') : cur.size) : (size === 'Custom' ? customSize || 'Custom' : size);
              const displayDesign = cur ? cur.designType : designType;
              const displayMat = cur ? cur.material : material;
              const displayFinish = cur ? cur.finish : finish;
              const displayQty = cur ? cur.qty : noOfUnits;
              const displayCarpRate = cur ? cur.carpenterLabourRate : carpenterLabourRate;
              const displayCarpDate = cur ? cur.carpenterDeliveryDate : carpenterDeliveryDate;
              const displayPolRate = cur ? cur.polishLabourRate : polishLabourRate;
              const displayPolDate = cur ? cur.polishDeliveryDate : polishDeliveryDate;

              return (
                <div className="space-y-1.5 text-stone-600 font-sans">
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <strong className="text-stone-900">{displayCat}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sub-category:</span>
                    <strong className="text-stone-900">{displaySub}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Size constraint:</span>
                    <strong className="text-stone-900">{displaySize}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Design:</span>
                    <strong className="text-stone-900">{displayDesign}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Material:</span>
                    <strong className="text-stone-900">{displayMat}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Finish:</span>
                    <strong className="text-stone-900">{displayFinish.split(' ')[0]}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Units counts:</span>
                    <strong className="text-stone-900">{displayQty}</strong>
                  </div>
                  {displayCarpRate !== '' && (
                    <div className="flex justify-between">
                      <span>Carpenter Rate:</span>
                      <strong className="text-stone-900">₹{displayCarpRate}</strong>
                    </div>
                  )}
                  {displayCarpDate && (
                    <div className="flex justify-between text-stone-500 text-[11px]">
                      <span>Carpenter Target Date:</span>
                      <strong>{displayCarpDate}</strong>
                    </div>
                  )}
                  {displayPolRate !== '' && (
                    <div className="flex justify-between">
                      <span>Polish Rate:</span>
                      <strong className="text-stone-900">₹{displayPolRate}</strong>
                    </div>
                  )}
                  {displayPolDate && (
                    <div className="flex justify-between text-stone-500 text-[11px]">
                      <span>Polish Target Date:</span>
                      <strong>{displayPolDate}</strong>
                    </div>
                  )}
                  {custName && (
                    <div className="flex justify-between pt-1 border-t border-stone-150 font-serif">
                      <span>Customer:</span>
                      <strong className="text-stone-900 font-sans">{custName}</strong>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
