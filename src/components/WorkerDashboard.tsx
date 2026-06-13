/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Order, Customer, User, StatusLog, OrderStage, WoodSchedule, WoodPart } from '../types';
import { generateUUID } from '../db/store';
import { Clock, Eye, AlertCircle, CheckCircle, Upload, ArrowLeft, Image as ImageIcon, Camera, Trash2, Plus, Hammer, ExternalLink, UploadCloud, Video, X } from 'lucide-react';

function getDefaultWoodSchedule(order: Order): WoodSchedule {
  const sub = (order.sub_category || '').toLowerCase();
  const cat = (order.category || '').toLowerCase();
  
  let parts: WoodPart[] = [];
  let modelName = order.article_no ? order.article_no.split('/').pop() || 'BED-01' : 'BED-01';
  let sizeOfProduct = order.size === 'Custom' ? (order.custom_size || '5FT X 6.5FT') : (order.size || '5FT X 6.5FT');
  let catalogueName = order.category ? `${order.category} Catalogue` : 'Beds Catalogue';
  let defaultImage = 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&auto=format&fit=crop'; // High quality wooden Bed picture
  let sqft = 32.5;

  if (sub.includes('bed') || cat.includes('bed')) {
    catalogueName = 'Beds Catalogue';
    modelName = 'BED-01';
    sizeOfProduct = '5FT X 6.5FT';
    sqft = 32.5;
    defaultImage = 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=650&auto=format&fit=crop';
    parts = [
      { id: 'part_1', part_name: 'BACKSIDE LEGS', width: 3, breadth: 3, length: 3.5, quantity: 2 },
      { id: 'part_2', part_name: 'FRONT LEGS', width: 3, breadth: 3, length: 1.5, quantity: 3 },
      { id: 'part_3', part_name: 'SIDE FRAMES', width: 4, breadth: 1.5, length: 7, quantity: 2 },
      { id: 'part_4', part_name: 'FRAME', width: 4, breadth: 1.5, length: 5, quantity: 3 },
      { id: 'part_5', part_name: 'FRAME COMPONENTS', width: 3, breadth: 1.5, length: 5, quantity: 2 },
      { id: 'part_6', part_name: 'SUPPORT PIECES', width: 2.5, breadth: 2.5, length: 5, quantity: 3 },
      { id: 'part_7', part_name: 'HEAD REST CROSSBAR', width: 6, breadth: 1, length: 5, quantity: 1 },
      { id: 'part_8', part_name: 'HEAD REST SLATS', width: 14, breadth: 1, length: 2.5, quantity: 2 },
      { id: 'part_9', part_name: 'PANEL MADHLI PATTI', width: 4, breadth: 1.5, length: 1.5, quantity: 1 },
      { id: 'part_10', part_name: 'BOTTOM SUPPORT', width: 2.5, breadth: 1.5, length: 6, quantity: 3 },
    ];
  } else if (sub.includes('wardrobe') || sub.includes('cabinet') || sub.includes('almirah') || cat.includes('kitchen')) {
    catalogueName = 'Wardrobes & Cabinets';
    modelName = 'CAB-02';
    sizeOfProduct = '4FT X 7FT';
    sqft = 28;
    defaultImage = 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=650&auto=format&fit=crop';
    parts = [
      { id: 'part_1', part_name: 'SIDE PANELS', width: 0.75, breadth: 24, length: 7, quantity: 2 },
      { id: 'part_2', part_name: 'TOP & BOTTOM BOARDS', width: 0.75, breadth: 24, length: 4, quantity: 2 },
      { id: 'part_3', part_name: 'INTERNAL SHELVES', width: 0.75, breadth: 22, length: 4, quantity: 4 },
      { id: 'part_4', part_name: 'BACK PANEL PLYWOOD', width: 0.25, breadth: 48, length: 7, quantity: 1 },
      { id: 'part_5', part_name: 'SHUTTER DOORS', width: 0.75, breadth: 24, length: 6.5, quantity: 2 },
      { id: 'part_6', part_name: 'BASE PLINTH RIM', width: 4, breadth: 1.5, length: 4, quantity: 2 },
    ];
  } else if (sub.includes('table') || sub.includes('desk') || cat.includes('living')) {
    catalogueName = 'Tables Catalogue';
    modelName = 'TAB-15';
    sizeOfProduct = '5FT X 2.5FT';
    sqft = 12.5;
    defaultImage = 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=650&auto=format&fit=crop';
    parts = [
      { id: 'part_1', part_name: 'TABLE TOP COUNTER', width: 1.5, breadth: 30, length: 5, quantity: 1 },
      { id: 'part_2', part_name: 'HEAVY FOUR LEGS', width: 3, breadth: 3, length: 2.5, quantity: 4 },
      { id: 'part_3', part_name: 'LONG SIDE APRONS', width: 4, breadth: 1, length: 4.5, quantity: 2 },
      { id: 'part_4', part_name: 'SHORT END APRONS', width: 4, breadth: 1, length: 2, quantity: 2 },
      { id: 'part_5', part_name: 'DRAWER FACE BOARDS', width: 2, breadth: 0.75, length: 1.8, quantity: 2 },
    ];
  } else if (sub.includes('sofa') || sub.includes('chair') || sub.includes('couch')) {
    catalogueName = 'Sofa Collections';
    modelName = 'SOF-03';
    sizeOfProduct = '6.5FT X 3FT';
    sqft = 19.5;
    defaultImage = 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=650&auto=format&fit=crop';
    parts = [
      { id: 'part_1', part_name: 'OUTER BOTTOM FRAME', width: 3, breadth: 1.5, length: 6.5, quantity: 2 },
      { id: 'part_2', part_name: 'OUTER SIDE SUPPORT', width: 3, breadth: 1.5, length: 3, quantity: 2 },
      { id: 'part_3', part_name: 'SUPPORT CROSS MEMBERS', width: 2.5, breadth: 1.5, length: 3, quantity: 4 },
      { id: 'part_4', part_name: 'BASE BRACING LEGS', width: 3, breadth: 3, length: 0.75, quantity: 4 },
      { id: 'part_5', part_name: 'BACK REST FRAMES', width: 2.5, breadth: 1.5, length: 6.5, quantity: 3 },
    ];
  } else {
    // Default fallback
    catalogueName = 'General Timber Catalogue';
    modelName = 'MODEL-X';
    sizeOfProduct = 'Custom Size';
    sqft = 12.0;
    defaultImage = 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=650&auto=format&fit=crop';
    parts = [
      { id: 'part_1', part_name: 'MAIN STRUT BEAMS', width: 2, breadth: 2, length: 4, quantity: 4 },
      { id: 'part_2', part_name: 'CROSS SUPPORT RAILS', width: 1.5, breadth: 1.5, length: 3, quantity: 6 },
    ];
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
      // Polish person sees work only after carpentry passes QC Check 1
      return o.polish_person_id === currentUser.id && o.current_status !== 'Pending' && o.current_status !== 'Design' && o.current_status !== 'Carpentry' && o.current_status !== 'QC Check 1';
    }
  });

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
  const [parts, setParts] = React.useState<WoodPart[]>([]);
  const [showRefImg, setShowRefImg] = React.useState(false);

  const updatePartField = (id: string, field: keyof WoodPart, value: any) => {
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
    setImageLink(schedule.image_link || '');
    setParts(schedule.parts || []);
  };

  const handleOpenUpdate = (ord: Order) => {
    setActiveOrder(ord);
    if (isCarpenter) {
      setProgressStatus(ord.current_status === myStage ? 'wood_procurement' : 'completed');
      
      // Load or Initialize Wood Schedule data
      const schedule = ord.wood_schedule || getDefaultWoodSchedule(ord);
      setCatalogueName(schedule.catalogue_name);
      setModelName(schedule.model_name);
      setSizeOfProduct(schedule.size_of_product);
      setSqft(schedule.sqft || 0);
      setImageLink(schedule.image_link || '');
      setParts(schedule.parts || []);
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

    if (activeOrder.current_status !== myStage) {
      alert(`Access denied: You are assigned, but you can update order files and stage only during the "${myStage}" stage.`);
      return;
    }

    const nextStage: OrderStage = progressStatus === 'completed'
      ? (isCarpenter ? 'QC Check 1' : 'QC Check 2')
      : myStage;

    const statusLabel = progressStatus === 'completed'
      ? 'Completed'
      : progressStatus === 'wood_procurement'
      ? 'Wood Procurement'
      : progressStatus === 'under_carpentry'
      ? 'Under Carpentry'
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
      parts: parts
    };

    const updatedOrder: Order = {
      ...activeOrder,
      current_status: nextStage,
      images: [...existingOtherImages, ...newInProgressImages],
      updated_at: new Date().toISOString(),
      wood_schedule: isCarpenter ? woodScheduleData : activeOrder.wood_schedule,
    };

    onUpdateOrder(updatedOrder, log);
    setActiveOrder(null);
    alert(`Success: Staging status saved. Order advanced to "${nextStage}".`);
  };

  if (activeOrder) {
    // --- MODE B: UPDATE STATUS PAGE LAYOUT ---
    const activeCust = customers.find((c) => c.id === activeOrder.customer_id);
    return (
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
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase">Goal Delivery deadline</span>
                <strong className="text-stone-850 text-xs block font-mono mt-0.5">{activeOrder.delivery_date}</strong>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold block uppercase">Current workshop Stage</span>
                <span className="px-2 py-0.5 mt-1 rounded bg-stone-150 text-stone-700 font-bold text-[10px] block border w-fit">
                  {activeOrder.current_status}
                </span>
              </div>
            </div>
          </div>

          {/* Right actual Update Status inputs panel column matching screenshot 2 */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <form onSubmit={handleSaveStagingUpdate} className="space-y-6 text-xs text-stone-600">
              
              {/* Radios inputs matching completed states */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider font-sans">Progress Status *</label>
                <div className={`grid grid-cols-1 ${isCarpenter ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                  {isCarpenter ? (
                    <>
                      {/* Wood procurement tab */}
                      <label
                        className={`border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition ${
                          progressStatus === 'wood_procurement'
                            ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/10 text-amber-900'
                            : 'bg-stone-50 border-stone-200 text-stone-550'
                        }`}
                      >
                        <input
                          type="radio"
                          name="progressRadios"
                          checked={progressStatus === 'wood_procurement'}
                          onChange={() => setProgressStatus('wood_procurement')}
                          className="text-amber-700 focus:ring-amber-500 font-bold shrink-0 cursor-pointer"
                        />
                        <div>
                          <strong className="text-xs block font-sans">Wood procurement</strong>
                          <span className="text-[10px] text-stone-400 font-medium font-sans">Log materials and start wood preparation work</span>
                        </div>
                      </label>

                      {/* Under Carpentry tab */}
                      <label
                        className={`border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition ${
                          progressStatus === 'under_carpentry'
                            ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/10 text-amber-900'
                            : 'bg-stone-50 border-stone-200 text-stone-550'
                        }`}
                      >
                        <input
                          type="radio"
                          name="progressRadios"
                          checked={progressStatus === 'under_carpentry'}
                          onChange={() => setProgressStatus('under_carpentry')}
                          className="text-amber-700 focus:ring-amber-500 font-bold shrink-0 cursor-pointer"
                        />
                        <div>
                          <strong className="text-xs block font-sans">Under Carpentry</strong>
                          <span className="text-[10px] text-stone-400 font-medium font-sans">Active carpentry structure construction and assembly</span>
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
                    className={`border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition ${
                      progressStatus === 'completed'
                        ? 'bg-green-50/40 border-green-500 ring-2 ring-green-500/10 text-green-900'
                        : 'bg-stone-50 border-stone-200 text-stone-550'
                    }`}
                  >
                    <input
                      type="radio"
                      name="progressRadios"
                      checked={progressStatus === 'completed'}
                      onChange={() => setProgressStatus('completed')}
                      className="text-green-700 focus:ring-green-500 font-bold shrink-0 cursor-pointer"
                    />
                    <div>
                      <strong className="text-xs block font-sans">
                        Completed (Move to {isCarpenter ? 'QC Check 1' : 'QC Check 2'})
                      </strong>
                      <span className="text-[10px] text-stone-400 font-medium font-sans">Mark department task finished successfully</span>
                    </div>
                  </label>
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
                    
                    {/* Preset Pickers */}
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] font-bold text-stone-400 self-center mr-1 uppercase">Load Preset:</span>
                      <button
                        type="button"
                        onClick={() => handleLoadPreset('bed')}
                        className="px-2 py-1 text-[9px] font-black border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 text-amber-900 tracking-wide uppercase transition"
                      >
                        🛏️ Bed
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadPreset('cabinet')}
                        className="px-2 py-1 text-[9px] font-black border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 text-amber-900 tracking-wide uppercase transition"
                      >
                        🚪 Cabinet
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadPreset('table')}
                        className="px-2 py-1 text-[9px] font-black border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 text-amber-900 tracking-wide uppercase transition"
                      >
                        🪑 Table
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadPreset('sofa')}
                        className="px-2 py-1 text-[9px] font-black border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 text-amber-900 tracking-wide uppercase transition"
                      >
                        🛋️ Sofa
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Product details fields */}
                  <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl space-y-4">
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none">1. Product Identification Details</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-sans">
                      <div>
                        <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">Catalogue Name</label>
                        <input
                          type="text"
                          required
                          value={catalogueName}
                          onChange={(e) => setCatalogueName(e.target.value)}
                          placeholder="e.g. Beds Catalogue"
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593622] font-semibold text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">Model Name</label>
                        <input
                          type="text"
                          required
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          placeholder="e.g. BED-01"
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593622] font-semibold text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">Size of Product</label>
                        <input
                          type="text"
                          required
                          value={sizeOfProduct}
                          onChange={(e) => setSizeOfProduct(e.target.value)}
                          placeholder="e.g. 5ft × 6.5ft"
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593622] font-semibold text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">SQFT Area (Surface)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={sqft || ''}
                          onChange={(e) => setSqft(Number(e.target.value))}
                          placeholder="e.g. 32.5"
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593622] font-semibold text-stone-900 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 items-center">
                      <div>
                        <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">Reference Design Image Link</label>
                        <input
                          type="text"
                          value={imageLink}
                          onChange={(e) => setImageLink(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593622] text-[10px] font-mono text-stone-600"
                        />
                      </div>
                      <div className="pt-5 md:pt-4">
                        {imageLink && (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setShowRefImg(!showRefImg)}
                              className="inline-flex items-center gap-1.5 text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 p-1.5 px-3 rounded-lg hover:bg-amber-100 transition select-none"
                            >
                              <ImageIcon size={12} />
                              {showRefImg ? "Hide Reference Blueprint" : "Click here to View Image / Blueprint"}
                            </button>
                            {showRefImg && (
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-stone-200 shrink-0">
                                <img referrerPolicy="no-referrer" src={imageLink} alt="Model Thumbnail" className="object-cover w-full h-full" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {showRefImg && imageLink && (
                      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-inner bg-stone-100 max-h-[220px] max-w-lg mx-auto flex items-center justify-center p-1.5">
                        <img referrerPolicy="no-referrer" src={imageLink} alt="Detailed Reference Blueprint" className="max-h-[200px] object-contain rounded" />
                      </div>
                    )}
                  </div>

                  {/* Section 2: Wooden components table spreadsheet */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none">2. Wood Schedule Calculation Table</h4>
                      <button
                        type="button"
                        onClick={() => setParts([...parts, { id: 'part_' + Date.now(), part_name: '', width: 1, breadth: 1, length: 1, quantity: 1 }])}
                        className="inline-flex items-center gap-1 bg-[#593622] hover:bg-[#402414] text-white p-1 px-3 rounded-lg text-[10px] font-bold transition font-sans"
                      >
                        <Plus size={10} /> Add Part Row
                      </button>
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
                                        value={p.part_name}
                                        onChange={(e) => updatePartField(p.id, 'part_name', e.target.value.toUpperCase())}
                                        placeholder="e.g. Backside Legs"
                                        className="w-full p-1 border-0 focus:outline-none focus:ring-1 focus:ring-[#593622] rounded bg-transparent focus:bg-white text-stone-900 font-bold"
                                      />
                                    </td>

                                    {/* Width (inches) */}
                                    <td className="py-1 px-1 border-r border-stone-200">
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        min={0}
                                        value={p.width || ''}
                                        onChange={(e) => updatePartField(p.id, 'width', Number(e.target.value))}
                                        placeholder='0.0"'
                                        className="w-full p-1 border-0 text-center focus:outline-none focus:ring-1 focus:ring-[#593622] rounded bg-transparent focus:bg-white text-stone-900 font-mono font-bold"
                                      />
                                    </td>

                                    {/* Breadth (inches) */}
                                    <td className="py-1 px-1 border-r border-stone-200">
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        min={0}
                                        value={p.breadth || ''}
                                        onChange={(e) => updatePartField(p.id, 'breadth', Number(e.target.value))}
                                        placeholder='0.0"'
                                        className="w-full p-1 border-0 text-center focus:outline-none focus:ring-1 focus:ring-[#593622] rounded bg-transparent focus:bg-white text-stone-900 font-mono font-bold"
                                      />
                                    </td>

                                    {/* Length (feet) */}
                                    <td className="py-1 px-1 border-r border-stone-200">
                                      <input
                                        type="number"
                                        step="0.1"
                                        required
                                        min={0}
                                        value={p.length || ''}
                                        onChange={(e) => updatePartField(p.id, 'length', Number(e.target.value))}
                                        placeholder="0.0'"
                                        className="w-full p-1 border-0 text-center focus:outline-none focus:ring-1 focus:ring-[#593622] rounded bg-transparent focus:bg-white text-stone-900 font-mono font-bold"
                                      />
                                    </td>

                                    {/* Quantity */}
                                    <td className="py-1 px-1 border-r border-stone-200">
                                      <input
                                        type="number"
                                        required
                                        min={1}
                                        value={p.quantity || ''}
                                        onChange={(e) => updatePartField(p.id, 'quantity', Number(e.target.value))}
                                        placeholder="qty"
                                        className="w-full p-1 border-0 text-center focus:outline-none focus:ring-1 focus:ring-[#593622] rounded bg-transparent focus:bg-white text-stone-900 font-mono font-bold"
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
                                        onClick={() => setParts(parts.filter(pt => pt.id !== p.id))}
                                        className="p-1 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded transition flex items-center justify-center mx-auto"
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
                                  No components added yet. Tap "Add Part Row" or use the quick templates to prefill the table.
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
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-widest mb-1.5 font-sans">Add Notes *</label>
                <textarea
                  rows={3}
                  required
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Describe details: carcass work completed. Ready for QC. Materials cut sizes check passed."
                  className="w-full p-3 bg-stone-50 border border-stone-250 focus:border-[#593622] rounded-xl text-xs focus:outline-none font-semibold text-stone-850"
                />
              </div>

              {/* Upload dynamic live photos (Simulated Paste url) */}
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
                  className="px-4 py-2.5 border rounded-xl text-stone-500 font-bold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activeOrder.current_status !== myStage}
                  className="bg-[#593622] hover:bg-[#402414] disabled:opacity-50 text-white font-black px-5 py-2.5 rounded-xl shadow transition text-xs"
                >
                  Save Update
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
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
                  const isStagedMine = ord.current_status === myStage;
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
                      <td className="py-3.5 px-4 font-mono text-stone-500 font-semibold">{ord.delivery_date}</td>
                      <td className="py-3.5 px-4">
                        {isStagedMine ? (
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
            As a <strong>{currentUser.role.replace('_', ' ')}</strong> profile, you can update status and attach completion photos exclusively for orders currently at the <strong>{myStage}</strong> stage. Orders under QC or other departments are read-only.
          </p>
        </div>
      </div>

    </div>
  );
}
