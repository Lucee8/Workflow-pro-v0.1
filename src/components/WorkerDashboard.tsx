/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Order, Customer, User, StatusLog, OrderStage, WoodSchedule, WoodPart, normalizeStage } from '../types';
import { generateUUID } from '../db/store';
import { compareOrdersByArticleSerialDesc } from '../utils';
import { Clock, Eye, AlertCircle, CheckCircle, Upload, ArrowLeft, Image as ImageIcon, Camera, Trash2, Plus, Hammer, ExternalLink, UploadCloud, Video, X, CheckSquare, AlertTriangle } from 'lucide-react';

function getDefaultWoodSchedule(order: Order): WoodSchedule {
  const sub = (order.sub_category || '').toLowerCase();
  const cat = (order.category || '').toLowerCase();

  let parts: WoodPart[] = [];
  let modelName = order.article_no ? order.article_no.split('/').pop() || 'BED-01' : 'BED-01';
  let sizeOfProduct = order.size === 'Custom' ? (order.custom_size || '5FT X 6.5FT') : (order.size || '5FT X 6.5FT');
  let catalogueName = order.category ? `${order.category} Catalogue` : 'Beds Catalogue';

  // Find any Design Reference image from order
  const designRefImg = order.images?.find((img) => img.type === 'Design Reference')?.url;
  let defaultImage = designRefImg || 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=650&auto=format&fit=crop';
  let sqft = 32.5;

  if (sub.includes('bed') || cat.includes('bed')) {
    catalogueName = 'Beds Catalogue';
    modelName = 'BED-01';
    sizeOfProduct = '5FT X 6.5FT';
    sqft = 32.5;
    if (!designRefImg) {
      defaultImage = '  https://images.unsplash.com/photo-1540518614846-7eded433c457?w=650&auto=format&fit=crop';
    }
    parts = [];
  } else if (sub.includes('wardrobe') || sub.includes('cabinet') || sub.includes('almirah') || cat.includes('kitchen')) {
    catalogueName = 'Wardrobes & Cabinets';
    modelName = 'CAB-02';
    sizeOfProduct = '4FT X 7FT';
    sqft = 28;
    if (!designRefImg) {
      defaultImage = 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=650&auto=format&fit=crop';
    }
    parts = [];
  } else if (sub.includes('table') || sub.includes('desk') || cat.includes('living')) {
    catalogueName = 'Tables Catalogue';
    modelName = 'TAB-15';
    sizeOfProduct = '5FT X 2.5FT';
    sqft = 12.5;
    if (!designRefImg) {
      defaultImage = 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=650&auto=format&fit=crop';
    }
    parts = [];
  } else if (sub.includes('sofa') || sub.includes('chair') || sub.includes('couch')) {
    catalogueName = 'Sofa Collections';
    modelName = 'SOF-03';
    sizeOfProduct = '6.5FT X 3FT';
    sqft = 19.5;
    if (!designRefImg) {
      defaultImage = 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=650&auto=format&fit=crop';
    }
    parts = [];
  } else {
    // Default fallback
    catalogueName = 'General Timber Catalogue';
    modelName = 'MODEL-X';
    sizeOfProduct = 'Custom Size';
    sqft = 12.0;
    if (!designRefImg) {
      defaultImage = 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=650&auto=format&fit=crop';
    }
    parts = [];
  }

  return {
    catalogue_name: catalogueName,
    model_name: modelName,
    size_of_product: sizeOfProduct,
    sqft: sqft,
    image_link: defaultImage,
    parts
  };
}

interface WorkerDashboardProps {
  currentUser: User;
  orders: Order[];
  customers: Customer[];
  statusLogs: StatusLog[];
  onUpdateOrder: (updatedOrder: Order, newLog?: StatusLog) => void;
}

type ExtendedWoodPart = WoodPart & {
  id: string;
  width: number;
  breadth: number;
  length: number;
  quantity: number;
};

type WoodPartTableField = Exclude<keyof ExtendedWoodPart, 'id'>;

export default function WorkerDashboard({
  currentUser,
  orders,
  customers,
  statusLogs,
  onUpdateOrder,
}: WorkerDashboardProps) {
  const isCarpenter = currentUser.role === 'carpenter';
  const myStage: OrderStage = isCarpenter ? 'Carpentry' : 'Polish';

  // Filter orders assigned to this worker
  const myOrders = orders.filter((o) => {
    if (isCarpenter) {
      return o.carpenter_id === currentUser.id;
    } else {
      // Polish person sees work only after carpentry passes QC 1 (i.e. Polish stage or later)
      const stage = normalizeStage(o.current_status);
      return o.polish_person_id === currentUser.id && ['Polish', 'QC 2', 'Ready to Dispatch', 'Dispatched'].includes(stage);
    }
  }).sort(compareOrdersByArticleSerialDesc);

  // State: selected order for active edit
  const [activeOrder, setActiveOrder] = React.useState<Order | null>(null);

  // Form States for updating status (Section 5 and 6)
  const [progressStatus, setProgressStatus] = React.useState<string>('in_progress');
  const [updateNotes, setUpdateNotes] = React.useState('');
  const [inProgressFiles, setInProgressFiles] = React.useState<string[]>([]);
  const [simulateUrlInput, setSimulateUrlInput] = React.useState('');

  // Interactive Camera & Local Upload states for Worker update
  const [isWebcamActive, setIsWebcamActive] = React.useState(false);
  const [webcamStream, setWebcamStream] = React.useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const startWebcam = async () => {
    setWebcamError(null);
    setIsWebcamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
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
        "Could not launch camera stream. Please use the mobile native camera button or upload standard local files directly."
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setInProgressFiles((prev) => [...prev, dataUrl]);
        stopWebcam();
      }
    }
  };

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
          setInProgressFiles((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Safe release of webcam streams on activeOrder change or unmounting
  React.useEffect(() => {
    if (!activeOrder) {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
        setWebcamStream(null);
      }
      setIsWebcamActive(false);
    }
  }, [activeOrder]);

  React.useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [webcamStream]);

  // Wood Schedule edit states (replaces empty placeholder layout)
  const [catalogueName, setCatalogueName] = React.useState('');
  const [modelName, setModelName] = React.useState('');
  const [sizeOfProduct, setSizeOfProduct] = React.useState('');
  const [sqft, setSqft] = React.useState<number>(0);
  const [imageLink, setImageLink] = React.useState('');
  const [parts, setParts] = React.useState<ExtendedWoodPart[]>([]);
  const [showRefImg, setShowRefImg] = React.useState(false);
  const [lightboxImg, setLightboxImg] = React.useState<string | null>(null);

  const normalizeParts = React.useCallback((incomingParts: WoodPart[] = []) => {
    return incomingParts.map((part, index) => {
      const tablePart = part as WoodPart & Partial<ExtendedWoodPart>;

      return {
        ...part,
        id: tablePart.id || `part_${index + 1}`,
        part_name: tablePart.part_name || '',
        width: Number(tablePart.width ?? 1),
        breadth: Number(tablePart.breadth ?? 1),
        length: Number(tablePart.length ?? 1),
        quantity: Number(tablePart.quantity ?? 1),
      };
    }) as ExtendedWoodPart[];
  }, []);

  // QC Check 1 checkboxes state
  const [qcMeasurement, setQcMeasurement] = React.useState(false);
  const [qcFinishing, setQcFinishing] = React.useState(false);
  const [qcBuffer, setQcBuffer] = React.useState(false);

  const handleUploadRefImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeOrder) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        const newImg = {
          id: 'img_' + generateUUID().split('-')[0],
          url: dataUrl,
          type: 'Design Reference' as const,
          uploaded_at: new Date().toISOString(),
          uploaded_by: currentUser.name,
        };

        const updatedOrder: Order = {
          ...activeOrder,
          images: [...(activeOrder.images || []), newImg],
          updated_at: new Date().toISOString(),
        };

        setActiveOrder(updatedOrder);
        onUpdateOrder(updatedOrder);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const updatePartField = (id: string, field: WoodPartTableField, value: any) => {
    setParts((currentParts) =>
      currentParts.map((p) => {
        if (p.id === id) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  const handleLoadPreset = (presetType: 'bed' | 'cabinet' | 'table' | 'sofa') => {
    if (!activeOrder) return;
    const dummyOrder = { ...activeOrder, sub_category: presetType } as Order;
    const schedule = getDefaultWoodSchedule(dummyOrder);
    setCatalogueName(schedule.catalogue_name);
    setModelName(schedule.model_name);
    setSizeOfProduct(schedule.size_of_product);
    setSqft(schedule.sqft || 0);

    const originalDesignImg = activeOrder.images?.find((img) => img.type === 'Design Reference')?.url;
    if (originalDesignImg) {
      setImageLink(originalDesignImg);
    } else {
      setImageLink(schedule.image_link || '');
    }
    setParts(normalizeParts(schedule.parts));
  };

  const handleOpenUpdate = (ord: Order) => {
    setActiveOrder(ord);
    if (isCarpenter) {
      const initialSub = (ord.carpenter_sub_status === 'qc_check_1' || ord.carpenter_sub_status === 'completed')
        ? ord.carpenter_sub_status
        : 'under_carpentry';
      setProgressStatus(initialSub);

      // Check if wood schedule was rejected
      try {
        const savedStatuses = JSON.parse(localStorage.getItem('bhisez_wood_request_statuses') || '{}');
        if (savedStatuses[ord.id] === 'Rejected') {
          alert(`⚠️ REJECTED WOOD SHEET NOTICE:\n\nYour Wood Schedule Sheet for Article #${ord.article_no} was REJECTED by Admin!\n\nPlease review item dimensions in the Wood Schedule Calculation Table, update necessary parts, and click "Save & Submit Wood Sheet to Admin" to re-submit.`);
        }
      } catch (e) {
        console.error(e);
      }

      // Load or Initialize Wood Schedule data
      const schedule = ord.wood_schedule || getDefaultWoodSchedule(ord);
      setCatalogueName(schedule.catalogue_name);
      setModelName(schedule.model_name);
      setSizeOfProduct(schedule.size_of_product);
      setSqft(schedule.sqft || 0);

      const originalDesignImg = ord.images?.find((img) => img.type === 'Design Reference')?.url;
      // If the saved wood schedule STILL uses a generic unsplash placeholder but we have a custom design reference uploaded, open with the custom design reference!
      if (originalDesignImg && (!schedule.image_link || schedule.image_link.includes('unsplash.com'))) {
        setImageLink(originalDesignImg);
      } else {
        setImageLink(schedule.image_link || originalDesignImg || '');
      }

      setParts(normalizeParts(schedule.parts));
      if (schedule.qc_check_1_details) {
        setQcMeasurement(!!schedule.qc_check_1_details.measurement);
        setQcFinishing(!!schedule.qc_check_1_details.finishing);
        setQcBuffer(!!schedule.qc_check_1_details.buffer);
      } else if (ord.carpenter_sub_status === 'completed') {
        setQcMeasurement(true);
        setQcFinishing(true);
        setQcBuffer(true);
      } else {
        setQcMeasurement(false);
        setQcFinishing(false);
        setQcBuffer(false);
      }
      setShowRefImg(false);
    } else {
      setProgressStatus(ord.current_status === myStage ? 'in_progress' : 'completed');
    }
    setUpdateNotes('');
    setInProgressFiles(ord.images.filter(img => img.type === 'In-Progress').map(img => img.url));
  };

  const handleAddPhotos = () => {
    if (simulateUrlInput && simulateUrlInput.startsWith('http')) {
      setInProgressFiles([...inProgressFiles, simulateUrlInput]);
      setSimulateUrlInput('');
    } else {
      alert('Please enter a valid HTTP image path url, e.g. https://images.unsplash.com/photo-1595428774223-ef52624120d2');
    }
  };

  const handleSaveStagingUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    const woodReqStatus = (() => {
      try {
        const saved = localStorage.getItem('bhisez_wood_request_statuses');
        const map = saved ? JSON.parse(saved) : {};
        return map[activeOrder.id] || '';
      } catch {
        return '';
      }
    })();

    const isAllowedStage = isCarpenter
      ? ['Making Started', 'Wood Procurement', 'Carpentry', 'QC 1', 'QC Check 1', 'Designing'].includes(activeOrder.current_status)
      : activeOrder.current_status === myStage;

    if (!isAllowedStage) {
      alert(`Access denied: You are assigned, but you can update order files and stage only during active production stages.`);
      return;
    }

    let nextStage: OrderStage = activeOrder.current_status;
    let nextSubStatus: 'wood_procurement' | 'under_carpentry' | 'qc_check_1' | 'completed' | undefined = activeOrder.carpenter_sub_status;

    if (isCarpenter) {
      if (progressStatus === 'under_carpentry' || progressStatus === 'wood_procurement') {
        if (woodReqStatus === 'Approved') {
          nextSubStatus = 'qc_check_1';
          nextStage = 'Making Started';
        } else {
          nextSubStatus = 'under_carpentry'; // Stays in under_carpentry until Admin approves wood sheet in Wood Management
          nextStage = 'Making Started';

          // Set status in Wood Management to Pending so Admin can approve it
          try {
            const savedStatuses = JSON.parse(localStorage.getItem('bhisez_wood_request_statuses') || '{}');
            savedStatuses[activeOrder.id] = 'Pending';
            localStorage.setItem('bhisez_wood_request_statuses', JSON.stringify(savedStatuses));
          } catch (err) {
            console.error('Error setting wood request status to Pending:', err);
          }
        }
      } else if (progressStatus === 'qc_check_1') {
        nextSubStatus = 'completed';
        nextStage = 'Making Started';
      } else if (progressStatus === 'completed') {
        nextSubStatus = 'completed';
        nextStage = 'QC 1';
      }
    } else {
      if (progressStatus === 'completed') {
        nextStage = 'QC 2';
      }
    }

    const statusLabel = progressStatus === 'completed'
      ? (isCarpenter ? 'Completed (Carpentry Done)' : 'Completed')
      : progressStatus === 'under_carpentry'
      ? 'Under Carpentry'
      : progressStatus === 'qc_check_1'
      ? 'QC Check 1'
      : 'In Progress';

    const log: StatusLog = {
      id: 'log_' + generateUUID().split('-')[0],
      order_id: activeOrder.id,
      stage: nextStage,
      changed_by: currentUser.id,
      changed_by_name: currentUser.name,
      changed_by_role: currentUser.role,
      timestamp: new Date().toISOString(),
      note: updateNotes || `${currentUser.name} logged progress update: status set to "${statusLabel}".`,
    };

    // Reconstruct order images with newly uploaded list
    const existingOtherImages = activeOrder.images.filter(img => img.type !== 'In-Progress');
    const newInProgressImages = inProgressFiles.map(url => ({
      id: 'img_' + generateUUID().split('-')[0],
      url,
      type: 'In-Progress' as const,
      uploaded_at: new Date().toISOString(),
      uploaded_by: currentUser.name,
    }));

    // Assemble Wood Schedule metadata
    const woodScheduleData: WoodSchedule = {
      catalogue_name: catalogueName,
      model_name: modelName,
      size_of_product: sizeOfProduct,
      sqft: Number(sqft),
      image_link: imageLink,
      parts: parts,
      qc_check_1_details: {
        measurement: qcMeasurement,
        finishing: qcFinishing,
        buffer: qcBuffer,
      }
    };

    const updatedOrder: Order = {
      ...activeOrder,
      current_status: nextStage,
      carpenter_sub_status: isCarpenter ? nextSubStatus : activeOrder.carpenter_sub_status,
      images: [...existingOtherImages, ...newInProgressImages],
      updated_at: new Date().toISOString(),
      wood_schedule: isCarpenter ? woodScheduleData : activeOrder.wood_schedule,
    };

    onUpdateOrder(updatedOrder, log);

    if (isCarpenter && ['Making Started', 'Wood Procurement', 'Carpentry', 'QC 1', 'QC Check 1'].includes(nextStage)) {
      setActiveOrder(updatedOrder);
      setProgressStatus(nextSubStatus || 'under_carpentry');
      setUpdateNotes('');
      if (progressStatus === 'under_carpentry' || progressStatus === 'wood_procurement') {
        if (woodReqStatus === 'Approved') {
          alert('Success: Under Carpentry progress saved! Sub-status has advanced to "QC Check 1".');
        } else {
          alert('Success: Wood Schedule Calculation Sheet saved! Sent to Admin Wood Management for sheet approval.');
        }
      } else if (progressStatus === 'qc_check_1') {
        alert('Success: QC Check 1 verified! Sub-status has auto-advanced to "Completed (Carpentry Done)".');
      }
    } else {
      setActiveOrder(null);
      alert(`Success: Staging status saved. Order advanced to "${nextStage}".`);
    }
  };

  if (activeOrder) {
    // --- MODE B: UPDATE STATUS PAGE LAYOUT ---
    const activeCust = customers.find((c) => c.id === activeOrder.customer_id);
    const savedSub = activeOrder.carpenter_sub_status || 'wood_procurement';

    const woodReqStatus = (() => {
      try {
        const saved = localStorage.getItem('bhisez_wood_request_statuses');
        const map = saved ? JSON.parse(saved) : {};
        return map[activeOrder.id] || '';
      } catch {
        return '';
      }
    })();
    const isPendingWoodApproval = isCarpenter && progressStatus === 'under_carpentry' && woodReqStatus === 'Pending';

    const orderRefImages = activeOrder.images?.filter((img) => img.type === 'Design Reference') || [];
    const allOrderImages = activeOrder.images || [];
    const fallbackImage = activeOrder.wood_schedule?.image_link || getDefaultWoodSchedule(activeOrder).image_link;
    const galleryImages = orderRefImages.length > 0
      ? orderRefImages
      : (allOrderImages.length > 0 ? allOrderImages : [{ id: 'default_ref_img', url: fallbackImage, type: 'Design Reference' as const }]);

    return (
      <>
        <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header navigation back */}
        <button
          onClick={() => setActiveOrder(null)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 transition"
        >
          <ArrowLeft size={14} /> Back to workbench listings
        </button>

        <div className="pb-2 border-b border-stone-200">
          <h1 className="text-xl md:text-2xl font-black text-stone-900 tracking-tight font-display">Update Technical Status</h1>
          <p className="text-stone-500 text-xs">Verify measurements, log notes, and upload floor completion photographs</p>
        </div>

        {/* Dynamic Splits design columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left specification summarizations column */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4 font-sans text-xs">
            <h3 className="font-display font-black text-stone-900 text-sm border-b border-stone-100 pb-2">Order Information Details</h3>

            <div className="space-y-3.5 leading-relaxed text-stone-600">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase">Article Number</span>
                <strong className="text-stone-900 text-sm font-mono mt-0.5 block tracking-wide">{activeOrder.article_no}</strong>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase">Customer Match</span>
                <strong className="text-stone-850 text-xs block mt-0.5">{activeCust?.name || 'Walkin Customer'}</strong>
              </div>
              {currentUser.role === 'admin' && (
                <div>
                  <span className="text-[10px] text-stone-400 font-bold block uppercase">Goal Delivery deadline</span>
                  <strong className="text-stone-850 text-xs block font-mono mt-0.5">{activeOrder.delivery_date}</strong>
                </div>
              )}
              {activeOrder.carpenter_delivery_date && (
                <div>
                  <span className="text-[10px] text-amber-800 font-bold block uppercase">Carpenter Delivery Date</span>
                  <strong className="text-amber-950 text-xs block font-mono mt-0.5">{activeOrder.carpenter_delivery_date}</strong>
                </div>
              )}
              {activeOrder.polish_delivery_date && (
                <div>
                  <span className="text-[10px] text-teal-800 font-bold block uppercase">Polish Delivery Date</span>
                  <strong className="text-teal-950 text-xs block font-mono mt-0.5">{activeOrder.polish_delivery_date}</strong>
                </div>
              )}
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase">Current workshop Stage</span>
                <span className="px-2 py-0.5 mt-1 rounded bg-stone-150 text-stone-700 font-bold text-[10px] block border w-fit">
                  {activeOrder.current_status}
                </span>
              </div>
            </div>

            {/* REFERENCE IMAGES CARD IN LEFT SIDEBAR */}
            <div className="pt-3.5 border-t border-stone-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-500 font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <ImageIcon size={13} className="text-[#593622]" /> Reference Drawings & Photos
                </span>
                <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                  {orderRefImages.length > 0 ? `${orderRefImages.length} Attached` : 'Catalogue Spec'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {galleryImages.slice(0, 4).map((img, idx) => (
                  <div
                    key={img.id || idx}
                    onClick={() => setLightboxImg(img.url ?? null)}
                    className="relative group rounded-xl overflow-hidden border border-stone-200 bg-stone-100 aspect-square cursor-pointer hover:border-[#593622] transition shadow-2xs"
                  >
                    <img referrerPolicy="no-referrer" src={img.url} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[9px] font-bold gap-1">
                      <Eye size={16} />
                      <span>Expand</span>
                    </div>
                  </div>
                ))}
              </div>

              <label className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-stone-50 hover:bg-stone-100 border border-dashed border-stone-300 rounded-lg text-stone-700 text-[11px] font-bold cursor-pointer transition">
                <Upload size={12} className="text-[#593622]" />
                <span>Upload Reference Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadRefImage} />
              </label>
            </div>
          </div>

          {/* Right actual Update Status inputs panel column matching screenshot 2 */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            {isCarpenter && (() => {
              if (!activeOrder) return null;
              if (woodReqStatus === 'Rejected') {
                return (
                  <div className="mb-5 bg-red-50 border-2 border-red-400 text-red-950 p-4 rounded-xl space-y-1.5 shadow-xs font-sans">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={20} className="text-red-600 shrink-0 animate-bounce" />
                      <h4 className="font-extrabold text-xs sm:text-sm text-red-900 uppercase tracking-wide">
                        ⚠️ Wood Schedule Sheet Rejected by Admin
                      </h4>
                    </div>
                    <p className="text-xs text-red-800 font-semibold leading-relaxed">
                      Your Wood Schedule Calculation Sheet for Article #{activeOrder.article_no} was <strong>REJECTED</strong> by Admin. Please update the item dimensions in the <strong>Wood Schedule Calculation Table</strong> below, make required corrections, and click <strong>"Save & Submit Wood Sheet to Admin"</strong> to re-submit for review.
                    </p>
                  </div>
                );
              }
              if (woodReqStatus === 'Pending' && progressStatus === 'under_carpentry') {
                return (
                  <div className="mb-5 bg-amber-50 border-2 border-amber-400 text-amber-950 p-4 rounded-xl space-y-1.5 shadow-xs font-sans animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Clock size={20} className="text-amber-700 shrink-0 animate-pulse" />
                      <h4 className="font-extrabold text-xs sm:text-sm text-amber-900 uppercase tracking-wide">
                        ⏳ Wood Sheet Submitted - Awaiting Admin Approval
                      </h4>
                    </div>
                    <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                      Your Wood Schedule Calculation Sheet for Article #{activeOrder.article_no} was <strong>submitted</strong> and is currently under Admin review in <strong>Wood Management</strong>. Editing and re-submitting is locked. Once Admin approves the sheet, this order will automatically advance!
                    </p>
                  </div>
                );
              }
              if (woodReqStatus === 'Approved' && progressStatus === 'under_carpentry') {
                return (
                  <div className="mb-5 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 p-4 rounded-xl space-y-1.5 shadow-xs font-sans animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={20} className="text-emerald-600 shrink-0" />
                      <h4 className="font-extrabold text-xs sm:text-sm text-emerald-900 uppercase tracking-wide">
                        ✅ Wood Schedule Sheet Approved by Admin
                      </h4>
                    </div>
                    <p className="text-xs text-emerald-800 font-semibold leading-relaxed">
                      Your Wood Schedule Calculation Sheet for Article #{activeOrder.article_no} was <strong>APPROVED</strong> by Admin! You can now verify cut dimensions, complete carpentry assembly, and click <strong>"Save & Advance to QC Check 1"</strong> below.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            <form onSubmit={handleSaveStagingUpdate} className="space-y-6 text-xs text-stone-600">

              {/* Radios inputs matching completed states */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider font-sans">Progress Status *</label>
                <div className={`grid grid-cols-1 ${isCarpenter ? 'sm:grid-cols-2' : 'sm:grid-cols-2'} gap-3`}>
                  {isCarpenter ? (
                    <>
                      {/* Under Carpentry tab */}
                      <label
                        className={`border rounded-xl p-3.5 flex items-center gap-3 transition ${
                          (savedSub === 'qc_check_1' || savedSub === 'completed')
                            ? 'bg-stone-100 opacity-60 border-stone-200 text-stone-400 cursor-not-allowed select-none'
                            : progressStatus === 'under_carpentry'
                            ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/10 text-amber-900 cursor-pointer'
                            : 'bg-stone-50 border-stone-200 text-stone-550 hover:bg-stone-100 cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio"
                          name="progressRadios"
                          checked={progressStatus === 'under_carpentry'}
                          disabled={savedSub === 'qc_check_1' || savedSub === 'completed'}
                          onChange={() => setProgressStatus('under_carpentry')}
                          className="text-amber-700 focus:ring-amber-500 font-bold shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div>
                          <strong className="text-xs block font-sans">
                            Under Carpentry {(savedSub === 'qc_check_1' || savedSub === 'completed') && '(Passed ✔)'}
                          </strong>
                          <span className="text-[10px] text-stone-400 font-medium font-sans font-medium">Fill wood schedule calculation & construct carpentry structure</span>
                        </div>
                      </label>

                      {/* QC Check 1 tab */}
                      <label
                        className={`border rounded-xl p-3.5 flex items-center gap-3 transition ${
                          savedSub !== 'qc_check_1'
                            ? 'bg-stone-100 opacity-60 border-stone-200 text-stone-400 cursor-not-allowed select-none'
                            : progressStatus === 'qc_check_1'
                            ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/10 text-amber-900 cursor-pointer'
                            : 'bg-stone-50 border-stone-200 text-stone-550 hover:bg-stone-100 cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio"
                          name="progressRadios"
                          checked={progressStatus === 'qc_check_1'}
                          disabled={savedSub !== 'qc_check_1'}
                          onChange={() => setProgressStatus('qc_check_1')}
                          className="text-amber-700 focus:ring-amber-500 font-bold shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div>
                          <strong className="text-xs block font-sans">
                            QC Check 1 {savedSub === 'completed' && '(Passed ✔)'}
                          </strong>
                          <span className="text-[10px] text-stone-400 font-medium font-sans">Verify measurements, finishing & buffer specs</span>
                        </div>
                      </label>
                    </>
                  ) : (
                    /* Default In Progress (used by paint/polish) */
                    <label
                      className={`border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition ${
                        progressStatus === 'in_progress'
                          ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/10 text-amber-900'
                          : 'bg-stone-50 border-stone-200 text-stone-550'
                      }`}
                    >
                      <input
                        type="radio"
                        name="progressRadios"
                        checked={progressStatus === 'in_progress'}
                        onChange={() => setProgressStatus('in_progress')}
                        className="text-amber-700 focus:ring-amber-500 font-bold shrink-0 cursor-pointer"
                      />
                      <div>
                        <strong className="text-xs block font-sans">In Progress</strong>
                        <span className="text-[10px] text-stone-400 font-medium font-sans">Continue work on active cabinetry floor cutting</span>
                      </div>
                    </label>
                  )}

                  <label
                    className={`border rounded-xl p-3.5 flex items-center gap-3 transition ${
                      isCarpenter && savedSub !== 'completed'
                        ? 'bg-stone-100 opacity-60 border-stone-200 text-stone-400 cursor-not-allowed select-none'
                        : progressStatus === 'completed'
                        ? 'bg-green-50/40 border-green-500 ring-2 ring-green-500/10 text-green-900 cursor-pointer'
                        : 'bg-stone-50 border-stone-200 text-stone-550 hover:bg-stone-100 cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="progressRadios"
                      checked={progressStatus === 'completed'}
                      disabled={isCarpenter && savedSub !== 'completed'}
                      onChange={() => setProgressStatus('completed')}
                      className="text-green-700 focus:ring-green-500 font-bold shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div>
                      <strong className="text-xs block font-sans">
                        {isCarpenter ? 'Completed (Carpentry Done)' : 'Completed (Move to QC Check 2)'}
                      </strong>
                      <span className="text-[10px] text-stone-400 font-medium font-sans">Mark department task finished successfully</span>
                    </div>
                  </label>
                </div>

                {/* QC Check 1 Checkboxes Panel */}
                {isCarpenter && (progressStatus === 'qc_check_1' || savedSub === 'qc_check_1' || savedSub === 'completed') && (
                  <div className="mt-3.5 p-3.5 bg-amber-50/70 border border-amber-300/80 rounded-xl space-y-2.5 animate-in fade-in duration-200 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="text-[#593622]" size={16} />
                        <span className="font-bold text-xs text-amber-950 uppercase tracking-wide font-sans">
                          QC Check 1 Checklist
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-200/90 text-amber-950 font-sans">
                        {[qcMeasurement, qcFinishing, qcBuffer].filter(Boolean).length} of 3 Checked
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* 1. Measurement */}
                      <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition cursor-pointer select-none ${
                        qcMeasurement ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-bold shadow-2xs' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={qcMeasurement}
                          onChange={(e) => setQcMeasurement(e.target.checked)}
                          className="h-4 w-4 rounded text-amber-800 focus:ring-amber-500 cursor-pointer shrink-0"
                        />
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs font-bold font-sans">1. Measurement</span>
                          <span className="text-[9px] text-stone-500 font-normal font-sans">Dimensions & size verified</span>
                        </div>
                      </label>

                      {/* 2. Finishing */}
                      <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition cursor-pointer select-none ${
                        qcFinishing ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-bold shadow-2xs' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={qcFinishing}
                          onChange={(e) => setQcFinishing(e.target.checked)}
                          className="h-4 w-4 rounded text-amber-800 focus:ring-amber-500 cursor-pointer shrink-0"
                        />
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs font-bold font-sans">2. Finishing</span>
                          <span className="text-[9px] text-stone-500 font-normal font-sans">Surface & edge preparation</span>
                        </div>
                      </label>

                      {/* 3. Buffer */}
                      <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition cursor-pointer select-none ${
                        qcBuffer ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-bold shadow-2xs' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={qcBuffer}
                          onChange={(e) => setQcBuffer(e.target.checked)}
                          className="h-4 w-4 rounded text-amber-800 focus:ring-amber-500 cursor-pointer shrink-0"
                        />
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs font-bold font-sans">3. Buffer</span>
                          <span className="text-[9px] text-stone-500 font-normal font-sans">Tolerances & joint margins</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* REFERENCE IMAGES & DESIGN BLUEPRINTS BANNER UNDER PROGRESS STATUS */}
              <div className="bg-[#fcfaf7] border border-amber-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-amber-200/60 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#593622] text-amber-300 shrink-0">
                      <ImageIcon size={15} />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-stone-900 text-xs sm:text-sm tracking-tight leading-none">
                        Design Reference & Blueprint Photos
                      </h3>
                      <p className="text-[10px] text-stone-500 mt-0.5 font-medium">
                        Approved blueprints, sketches & catalog reference photos for Article #{activeOrder.article_no}
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#593622] hover:bg-[#402414] text-white rounded-lg text-[10px] font-bold cursor-pointer transition shadow-xs w-fit">
                    <Upload size={11} />
                    <span>+ Add Reference Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadRefImage} />
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      onClick={() => setLightboxImg(img.url ?? null)}
                      className="relative group rounded-xl border border-stone-200 overflow-hidden bg-stone-100 h-28 cursor-pointer hover:border-[#593622] hover:shadow-md transition"
                    >
                      <img referrerPolicy="no-referrer" src={img.url} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                        <Eye size={16} />
                        <span>Click to Expand</span>
                      </div>
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                        {img.type || 'Design Reference'} #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: BHISE'Z WOOD REGISTRATION & REQUIREMENT CALCULATOR */}
              {isCarpenter && (
                <div className="bg-[#fdfbfc] border border-[#593622]/20 rounded-2xl p-4 md:p-5 space-y-5 shadow-xs">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-150 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1 px-2.5 rounded-lg bg-[#593622]/10 border border-[#593622]/30 text-[#593622]">
                        <Hammer size={16} className="animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-display font-black text-[#593622] text-sm tracking-tight leading-none">Wood Requirement & Estimation Calculator</h3>
                        <p className="text-[10px] text-stone-400 mt-1 font-medium select-none">Estimate and record total material volume (CFT) required for fabrication</p>
                      </div>
                    </div>


                  </div>

                  {/* Section 1: Product details fields */}
                  <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl space-y-4">
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none">1. Product Identification Details</h4>

                    {/* Fetched Product Configuration & Specifications from Section 2 */}
                    {activeOrder && (
                      <div className="bg-white p-3.5 border border-amber-200/80 rounded-xl shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-150">
                          <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                            📋 Product Configuration & Specifications (Fetched from Order Specs)
                          </span>
                          <span className="text-[9px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 font-mono">
                            Article #{activeOrder.article_no}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 text-xs">
                          <div>
                            <span className="text-[9px] text-stone-400 font-bold block uppercase tracking-wide">Category</span>
                            <strong className="text-stone-850 block font-semibold text-xs mt-0.5">{activeOrder.category || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-stone-400 font-bold block uppercase tracking-wide">Sub-category</span>
                            <strong className="text-stone-850 block font-semibold text-xs mt-0.5">{activeOrder.sub_category || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-stone-400 font-bold block uppercase tracking-wide">Sizing Constraints</span>
                            <strong className="text-stone-850 block font-semibold text-xs mt-0.5">
                              {activeOrder.size === 'Custom' ? activeOrder.custom_size || 'Custom' : activeOrder.size || 'N/A'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-stone-400 font-bold block uppercase tracking-wide">Design Blueprints</span>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 font-bold text-[9px] border rounded bg-stone-50 text-stone-700 border-stone-200">
                              {activeOrder.design_type || 'Standard'} Layout
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-stone-400 font-bold block uppercase tracking-wide">Structural Material</span>
                            <strong className="text-stone-850 block font-semibold text-xs mt-0.5">{activeOrder.material || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-stone-400 font-bold block uppercase tracking-wide">Finish Polish</span>
                            <strong className="text-stone-850 block font-semibold text-xs mt-0.5">{activeOrder.finish || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-stone-400 font-bold block uppercase tracking-wide">Color Shade</span>
                            <strong className="text-stone-850 block font-semibold text-xs mt-0.5">{activeOrder.color_shade || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-stone-400 font-bold block uppercase tracking-wide">Units Count</span>
                            <strong className="text-stone-850 block font-semibold text-xs mt-0.5">{activeOrder.no_of_units || 1} pieces</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-sans">
                      <div>
                        <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">Catalogue Name</label>
                        <input
                          type="text"
                          required
                          disabled={isPendingWoodApproval}
                          value={catalogueName}
                          onChange={(e) => setCatalogueName(e.target.value)}
                          placeholder="e.g. Beds Catalogue"
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593622] font-semibold text-stone-900 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">Model Name</label>
                        <input
                          type="text"
                          required
                          disabled={isPendingWoodApproval}
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          placeholder="e.g. BED-01"
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593622] font-semibold text-stone-900 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">Size of Product</label>
                        <input
                          type="text"
                          required
                          disabled={isPendingWoodApproval}
                          value={sizeOfProduct}
                          onChange={(e) => setSizeOfProduct(e.target.value)}
                          placeholder="e.g. 5ft × 6.5ft"
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593622] font-semibold text-stone-900 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">SQFT Area (Surface)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          disabled={isPendingWoodApproval}
                          value={sqft || ''}
                          onChange={(e) => setSqft(Number(e.target.value))}
                          placeholder="e.g. 32.5"
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593622] font-semibold text-stone-900 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Wooden components table spreadsheet */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none">2. Wood Schedule Calculation Table</h4>
                      <div className="flex items-center gap-2">
                        {parts.length > 0 && (
                          <button
                            type="button"
                            disabled={isPendingWoodApproval}
                            onClick={() => setParts([])}
                            className="inline-flex items-center gap-1 bg-stone-200 hover:bg-stone-300 disabled:opacity-50 disabled:cursor-not-allowed text-stone-700 p-1 px-2.5 rounded-lg text-[10px] font-bold transition font-sans cursor-pointer"
                          >
                            <Trash2 size={10} /> Clear Table
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isPendingWoodApproval}
                          onClick={() => setParts([...parts, { id: 'part_' + Date.now(), part_name: '', width: 1, breadth: 1, length: 1, quantity: 1 }])}
                          className="inline-flex items-center gap-1 bg-[#593622] hover:bg-[#402414] disabled:opacity-50 disabled:cursor-not-allowed text-white p-1 px-3 rounded-lg text-[10px] font-bold transition font-sans cursor-pointer"
                        >
                          <Plus size={10} /> Add Part Row
                        </button>
                      </div>
                    </div>

                    <div className="border border-stone-250 rounded-xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-stone-100 border-b border-stone-250 text-center text-stone-500 font-bold uppercase text-[9px] tracking-wider select-none">
                              <th className="py-2.5 px-3 text-left min-w-[145px] border-r border-stone-200">Part Name & Component Purpose</th>
                              <th className="py-2.5 px-2 w-[75px] border-r border-stone-200 text-center">Width (Inches)</th>
                              <th className="py-2.5 px-2 w-[75px] border-r border-stone-200 text-center">Breadth (Inches)</th>
                              <th className="py-2.5 px-2 w-[75px] border-r border-stone-200 text-center">Length (Feet)</th>
                              <th className="py-2.5 px-2 w-[65px] border-r border-stone-200 text-center">QTY</th>
                              <th className="py-2.5 px-2 w-[85px] border-r border-stone-200 text-right">CFT Vol.</th>
                              <th className="py-2.5 px-1.5 w-[45px]">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200 bg-white">
                            {parts.length > 0 ? (
                              parts.map((p, idx) => {
                                const partCft = ((p.width * p.breadth * p.length) / 144) * p.quantity;
                                return (
                                  <tr key={p.id} className="hover:bg-amber-50/10 text-center font-semibold text-stone-850">
                                    {/* Name input */}
                                    <td className="py-1 px-2 text-left border-r border-stone-200">
                                      <input
                                        type="text"
                                        required
                                        disabled={isPendingWoodApproval}
                                        value={p.part_name}
                                        onChange={(e) => updatePartField(p.id, 'part_name', e.target.value.toUpperCase())}
                                        placeholder="e.g. Backside Legs"
                                        className="w-full p-1 border-0 focus:outline-none focus:ring-1 focus:ring-[#593622] rounded bg-transparent focus:bg-white text-stone-900 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                      />
                                    </td>

                                    {/* Width (inches) */}
                                    <td className="py-1 px-1 border-r border-stone-200">
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        min={0}
                                        disabled={isPendingWoodApproval}
                                        value={p.width || ''}
                                        onChange={(e) => updatePartField(p.id, 'width', Number(e.target.value))}
                                        placeholder='0.0"'
                                        className="w-full p-1 border-0 text-center focus:outline-none focus:ring-1 focus:ring-[#593622] rounded bg-transparent focus:bg-white text-stone-900 font-mono font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                      />
                                    </td>

                                    {/* Breadth (inches) */}
                                    <td className="py-1 px-1 border-r border-stone-200">
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        min={0}
                                        disabled={isPendingWoodApproval}
                                        value={p.breadth || ''}
                                        onChange={(e) => updatePartField(p.id, 'breadth', Number(e.target.value))}
                                        placeholder='0.0"'
                                        className="w-full p-1 border-0 text-center focus:outline-none focus:ring-1 focus:ring-[#593622] rounded bg-transparent focus:bg-white text-stone-900 font-mono font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                      />
                                    </td>

                                    {/* Length (feet) */}
                                    <td className="py-1 px-1 border-r border-stone-200">
                                      <input
                                        type="number"
                                        step="0.1"
                                        required
                                        min={0}
                                        disabled={isPendingWoodApproval}
                                        value={p.length || ''}
                                        onChange={(e) => updatePartField(p.id, 'length', Number(e.target.value))}
                                        placeholder="0.0'"
                                        className="w-full p-1 border-0 text-center focus:outline-none focus:ring-1 focus:ring-[#593622] rounded bg-transparent focus:bg-white text-stone-900 font-mono font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                      />
                                    </td>

                                    {/* Quantity */}
                                    <td className="py-1 px-1 border-r border-stone-200">
                                      <input
                                        type="number"
                                        required
                                        min={1}
                                        disabled={isPendingWoodApproval}
                                        value={p.quantity || ''}
                                        onChange={(e) => updatePartField(p.id, 'quantity', Number(e.target.value))}
                                        placeholder="qty"
                                        className="w-full p-1 border-0 text-center focus:outline-none focus:ring-1 focus:ring-[#593622] rounded bg-transparent focus:bg-white text-stone-900 font-mono font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                      />
                                    </td>

                                    {/* Computed CFT */}
                                    <td className="py-1 px-3 border-r border-stone-200 text-stone-850 font-mono whitespace-nowrap text-right">
                                      {isNaN(partCft) ? '0.00' : partCft.toFixed(2)} CFT
                                    </td>

                                    {/* Delete trigger */}
                                    <td className="py-1 px-1.5">
                                      <button
                                        type="button"
                                        disabled={isPendingWoodApproval}
                                        onClick={() => setParts(parts.filter(pt => pt.id !== p.id))}
                                        className="p-1 text-stone-400 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed rounded transition flex items-center justify-center mx-auto"
                                        title="Remove part row"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-stone-400 italic font-medium font-sans">
                                  No components added yet. Tap "+ Add Part Row" above to enter wood schedule items manually.
                                </td>
                              </tr>
                            )}

                            {/* Total CFT Summary Row */}
                            <tr className="bg-amber-50/40 font-bold border-t border-stone-250 select-none text-[#593622]">
                              <td colSpan={5} className="py-3 px-3 uppercase text-right text-[10px] tracking-wider border-r border-stone-200 font-bold font-sans">
                                🛠️ Total Wood Volume Required:
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-[13px] border-r border-stone-200 font-black">
                                {parts.reduce((tot, p) => tot + (((p.width * p.breadth * p.length) / 144) * p.quantity), 0).toFixed(2)} CFT
                              </td>
                              <td className="bg-white"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Progress notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-widest mb-1.5 font-sans">
                  Add Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Describe details: carcass work completed, wood schedule items, or cut sizes check passed..."
                  className="w-full p-3 bg-stone-50 border border-stone-250 focus:border-[#593622] rounded-xl text-xs focus:outline-none font-semibold text-stone-850"
                />
              </div>

              {/* Upload dynamic live photos */}
              <div className="space-y-3 font-sans">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-widest">Upload progress photographs</label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Local file and mobile camera buttons */}
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Local Attachment</span>
                        <p className="text-[11px] text-stone-500 leading-normal">Choose existing files from your mobile phone memory or PC desktop gallery.</p>
                      </div>

                      <div className="flex gap-1.5 pt-1.5">
                        <label className="flex-1 bg-white border border-stone-300 rounded-lg p-2 flex items-center justify-center gap-1.5 hover:border-[#593622] hover:bg-stone-50 cursor-pointer shadow-3xs font-extrabold text-[11px] text-stone-850 transition-colors">
                          <UploadCloud size={13} className="text-[#593622]" />
                          <span>Browse file</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLocalFileUpload}
                            className="hidden"
                          />
                        </label>

                        <label className="flex-1 bg-[#593622] text-white rounded-lg p-2 flex items-center justify-center gap-1.5 hover:bg-[#402414] cursor-pointer shadow-3xs font-black uppercase text-[10px] tracking-wider transition-colors">
                          <Camera size={13} />
                          <span>Direct Camera</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleLocalFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Webcam Live Capture block */}
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Workshop Scan</span>
                        <p className="text-[11px] text-stone-500 leading-normal font-sans">Record snapshots of cut wood or finished polishing stages instantly.</p>
                      </div>

                      {!isWebcamActive ? (
                        <button
                          type="button"
                          onClick={startWebcam}
                          className="w-full bg-[#593622]/10 border border-[#593622]/35 text-[#593622] hover:bg-[#593622]/20 font-bold uppercase text-[10px] tracking-widest p-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Video size={13} />
                          <span>Start Viewfinder</span>
                        </button>
                      ) : (
                        <div className="bg-stone-950 rounded-lg overflow-hidden relative border border-stone-900 aspect-video flex flex-col justify-end">
                          {webcamError ? (
                            <div className="p-2 text-[9px] text-red-400 font-bold text-center flex flex-col items-center justify-center h-full">
                              <span>{webcamError}</span>
                              <button
                                type="button"
                                onClick={stopWebcam}
                                className="mt-1.5 p-0.5 px-2 bg-white text-stone-900 rounded font-black text-[8px] uppercase font-sans"
                              >
                                Close
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
                              <div className="absolute top-1 right-1 bg-black/60 p-0.5 px-1.5 rounded font-mono text-[8px] text-stone-300 font-bold tracking-widest animate-pulse flex items-center gap-0.5">
                                <span className="h-1 w-1 bg-red-600 rounded-full inline-block" /> WORKSHOP CAM
                              </div>
                              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-1 z-10">
                                <button
                                  type="button"
                                  onClick={captureSnapshot}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded font-black uppercase text-[9px] tracking-wider shadow"
                                >
                                  📸 SNAP
                                </button>
                                <button
                                  type="button"
                                  onClick={stopWebcam}
                                  className="bg-red-700 hover:bg-red-800 text-white p-1 px-2 rounded font-bold text-[9px] uppercase shadow"
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

                  {/* Collapsible reference URL */}
                  <details className="group bg-stone-100 border border-stone-250/70 rounded-xl overflow-hidden text-xs">
                    <summary className="p-2 font-bold text-stone-500 hover:text-[#593622] cursor-pointer select-none flex items-center justify-between text-[10px] uppercase tracking-wide">
                      <span>🔗 Paste manual snapshot link</span>
                      <span className="group-open:rotate-180 transition-transform">▼</span>
                    </summary>

                    <div className="p-3 border-t bg-stone-50 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={simulateUrlInput}
                          onChange={(e) => setSimulateUrlInput(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-1595..."
                          className="flex-1 px-2.5 py-1.5 bg-white border border-stone-250 rounded focus:outline-none text-xs text-stone-850 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={handleAddPhotos}
                          className="bg-[#593622] text-white hover:bg-[#402414] px-3.5 py-1.5 font-bold rounded text-[10px] uppercase transition shrink-0"
                        >
                          Append Link
                        </button>
                      </div>
                    </div>
                  </details>

                  {/* Grid gallery of files uploaded */}
                  {inProgressFiles.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {inProgressFiles.map((url, idx) => (
                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-stone-200">
                          <img referrerPolicy="no-referrer" src={url} alt="Uploaded" className="object-cover w-full h-full" />
                          <button
                            type="button"
                            onClick={() => setInProgressFiles(inProgressFiles.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-md font-bold text-[10px] h-5 w-5 flex items-center justify-center transition shadow"
                            title="Delete photograph"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 border-2 border-dashed border-stone-250 rounded-xl flex flex-col items-center justify-center text-stone-400 select-none">
                      <ImageIcon size={24} className="text-stone-300 mb-1 animate-pulse" />
                      <p className="font-bold text-stone-500">No progress snapshots attached</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Use camera button, local files browser, or paste custom urls.</p>
                    </div>
                  )}
                </div>

              {/* Action save brown button */}
              <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveOrder(null)}
                  className="px-4 py-2.5 border rounded-xl text-stone-500 font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isPendingWoodApproval || (
                      isCarpenter
                        ? !['Wood Procurement', 'Making Started', 'Carpentry', 'QC 1', 'QC Check 1', 'Designing'].includes(activeOrder.current_status)
                        : activeOrder.current_status !== myStage
                    )
                  }
                  className={`font-black px-5 py-2.5 rounded-xl shadow transition text-xs flex items-center gap-2 ${
                    isPendingWoodApproval
                      ? 'bg-amber-800/70 text-amber-100 cursor-not-allowed opacity-80'
                      : 'bg-[#593622] hover:bg-[#402414] disabled:opacity-50 text-white cursor-pointer disabled:cursor-not-allowed'
                  }`}
                >
                  {progressStatus === 'under_carpentry' ? (
                    isPendingWoodApproval ? (
                      <>
                        <Clock size={14} className="animate-pulse text-amber-200 shrink-0" />
                        <span>✓ Submitted - Awaiting Admin Approval</span>
                      </>
                    ) : woodReqStatus === 'Approved' ? (
                      <span>Save & Advance to QC Check 1</span>
                    ) : (
                      'Save & Submit Wood Sheet to Admin'
                    )
                  ) : (
                    'Save Update'
                  )}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>

      {/* Lightbox Modal for Reference Images */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl max-h-[90vh] w-full bg-stone-900 rounded-2xl overflow-hidden border border-stone-700 shadow-2xl flex flex-col">
            <div className="p-3 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-amber-400" />
                <span className="font-bold text-xs uppercase tracking-wider">Design Reference Image Lightbox</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3 flex-1 flex items-center justify-center overflow-auto bg-black/50 min-h-[300px]">
              <img referrerPolicy="no-referrer" src={lightboxImg} alt="Reference Full View" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg" />
            </div>
            <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-stone-400 text-[11px]">
              <span>Article #{activeOrder?.article_no} Blueprint Reference</span>
              <a href={lightboxImg} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline flex items-center gap-1 font-bold">
                <ExternalLink size={12} /> Open Full Size
              </a>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  // --- MODE A: LISTING WINDOW ---
  return (
    <div className="space-y-6">

      {/* Worker workbench Header details block */}
      <div>
        <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight">
          Workbench: {currentUser.name} ({currentUser.initials})
        </h1>
        <p className="text-stone-500 text-xs mt-1">
          Role: <strong className="uppercase">{currentUser.role.replace('_', ' ')}</strong> | Assigned work orders list overview
        </p>
      </div>

      {/* Orders Listings segment cards */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600 border-collapse" style={{ contentVisibility: 'auto' }}>
            <thead>
              <tr className="bg-stone-50 border-b border-stone-150 font-mono text-[10px] uppercase text-stone-400 font-black">
                <th className="py-3 px-4">Article No.</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Stage Status</th>
                <th className="py-3 px-4">Delivery Deadline</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-sans">
              {myOrders.length > 0 ? (
                myOrders.map((ord) => {
                  const matchingCust = customers.find((c) => c.id === ord.customer_id);
                  const isStagedMine = isCarpenter
                    ? ['Wood Procurement', 'Making Started', 'Carpentry', 'Design', 'Designing'].includes(ord.current_status)
                    : ord.current_status === myStage;
                  return (
                    <tr key={ord.id} className="hover:bg-stone-50/50 transition">
                      <td className="py-3.5 px-4 font-mono font-black text-stone-900">
                        {ord.article_no}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-stone-850">
                        {matchingCust?.name || 'Walk-In'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-stone-700">{ord.current_status}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-500 font-semibold">
                        {isCarpenter && ord.carpenter_delivery_date ? (
                          <div className="text-amber-900 font-bold">{ord.carpenter_delivery_date}</div>
                        ) : !isCarpenter && ord.polish_delivery_date ? (
                          <div className="text-teal-900 font-bold">{ord.polish_delivery_date}</div>
                        ) : (
                          <div>{ord.delivery_date}</div>
                        )}
                        {currentUser.role === 'admin' && (ord.carpenter_delivery_date || ord.polish_delivery_date) && (
                          <div className="text-[10px] text-stone-400 font-normal">Goal: {ord.delivery_date}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isCarpenter && (() => {
                          try {
                            const saved = localStorage.getItem('bhisez_wood_request_statuses');
                            const map = saved ? JSON.parse(saved) : {};
                            if (map[ord.id] === 'Approved' && (ord.carpenter_sub_status === 'under_carpentry' || !ord.carpenter_sub_status)) {
                              return (
                                <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-full px-2 py-0.5 font-bold text-[9px]">
                                  ✅ Sheet Approved
                                </span>
                              );
                            }
                            if (map[ord.id] === 'Rejected') {
                              return (
                                <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-300 rounded-full px-2 py-0.5 font-bold text-[9px] animate-pulse">
                                  ❌ Sheet Rejected
                                </span>
                              );
                            }
                            if (map[ord.id] === 'Pending' && (ord.carpenter_sub_status === 'under_carpentry' || ord.carpenter_sub_status === 'wood_procurement' || !ord.carpenter_sub_status)) {
                              return (
                                <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-300 rounded-full px-2 py-0.5 font-bold text-[9px]">
                                  ⏳ Sheet Pending Approval
                                </span>
                              );
                            }
                          } catch {
                            // ignore
                          }
                          return null;
                        })()}
                        {!(() => {
                          try {
                            const saved = localStorage.getItem('bhisez_wood_request_statuses');
                            const map = saved ? JSON.parse(saved) : {};
                            return map[ord.id] === 'Rejected' || (map[ord.id] === 'Pending' && (ord.carpenter_sub_status === 'under_carpentry' || ord.carpenter_sub_status === 'wood_procurement' || !ord.carpenter_sub_status));
                          } catch {
                            return false;
                          }
                        })() && (
                          isStagedMine ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-bold text-[9px] animate-pulse">
                              Needs Update
                            </span>
                          ) : ord.current_status === 'Ready to Dispatch' ? (
                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 font-bold text-[9px]">
                              Dispatched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-stone-400 bg-stone-50 border border-stone-200 rounded-full px-2 py-0.5 font-bold text-[9px]">
                              Staged
                            </span>
                          )
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenUpdate(ord)}
                          className={`p-1.5 px-3.5 rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1 ml-auto ${
                            isStagedMine
                              ? 'bg-[#593622] hover:bg-[#402414] text-white font-black'
                              : 'bg-stone-100 text-stone-400 cursor-not-allowed hover:bg-stone-100 hover:text-stone-400'
                          }`}
                          disabled={!isStagedMine}
                        >
                          <Eye size={12} />
                          Update Status
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400 font-sans italic">
                    <Clock size={20} className="mx-auto text-stone-300 mb-1" />
                    No orders currently assigned to your workbench.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Persistent warning banner message as shown in screenshot 1 */}
      <div className="bg-[#eff6ff] border border-blue-200 p-4 rounded-xl flex gap-3 text-xs text-blue-800 leading-normal">
        <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={16} />
        <div>
          <span className="font-bold">Technical update restriction guidelines</span>
          <p className="text-stone-600 mt-1">
            As a <strong>{currentUser.role.replace('_', ' ')}</strong> profile, you can update status, fill wood calculation sheets, and attach completion photos for orders currently at the <strong>{isCarpenter ? 'Wood Procurement & Carpentry' : myStage}</strong> stages. Orders under QC or other departments are read-only.
          </p>
        </div>
      </div>

    </div>
  );
}
