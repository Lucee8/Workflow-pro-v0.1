/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Order, Customer, User, StatusLog, OrderStage, WoodSchedule, WoodPart, normalizeStage } from '../types';
import { generateUUID } from '../db/store';
import { compareOrdersByArticleSerialDesc } from '../utils';
import OrderDetailsView from './OrderDetailsView';
import { Clock, Eye, AlertCircle, CheckCircle, Upload, ArrowLeft, Image as ImageIcon, Camera, Trash2, Plus, Hammer, ExternalLink, UploadCloud, Video, X, CheckSquare } from 'lucide-react';

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
      defaultImage = 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=650&auto=format&fit=crop';
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

export default function WorkerDashboard({
  currentUser,
  orders,
  customers,
  statusLogs,
  onUpdateOrder,
}: WorkerDashboardProps) {
  const isCarpenter = currentUser.role === 'carpenter';
  const isPolish = currentUser.role === 'polish_person';
  const isQC = currentUser.role === 'qc_staff';
  const myStage: OrderStage = isCarpenter ? 'Making Started' : 'Polish';

  // Filter orders assigned to this worker or role
  const myOrders = orders.filter((o) => {
    const stage = normalizeStage(o.current_status);
    if (isCarpenter) {
      return o.carpenter_id === currentUser.id || ['Wood Procurement', 'Making Started', 'QC 1', 'Making Completed'].includes(stage);
    } else if (isPolish) {
      return o.polish_person_id === currentUser.id || ['Polish'].includes(stage);
    } else if (isQC) {
      return ['QC 1', 'QC 2'].includes(stage);
    } else {
      return true;
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
  const [parts, setParts] = React.useState<WoodPart[]>([]);
  const [showRefImg, setShowRefImg] = React.useState(false);
  const [lightboxImg, setLightboxImg] = React.useState<string | null>(null);

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

    const originalDesignImg = activeOrder.images?.find((img) => img.type === 'Design Reference')?.url;
    if (originalDesignImg) {
      setImageLink(originalDesignImg);
    } else {
      setImageLink(schedule.image_link || '');
    }
    setParts(schedule.parts || []);
  };

  const handleOpenUpdate = (ord: Order) => {
    setActiveOrder(ord);
    if (isCarpenter) {
      setProgressStatus(ord.carpenter_sub_status || 'wood_procurement');

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

      setParts(schedule.parts || []);
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

    if (activeOrder.current_status !== myStage) {
      alert(`Access denied: You are assigned, but you can update order files and stage only during the "${myStage}" stage.`);
      return;
    }

    let nextStage: OrderStage = myStage;
    let nextSubStatus: 'wood_procurement' | 'under_carpentry' | 'qc_check_1' | 'completed' | undefined = activeOrder.carpenter_sub_status;

    if (isCarpenter) {
      if (progressStatus === 'wood_procurement') {
        nextSubStatus = 'under_carpentry';
      } else if (progressStatus === 'under_carpentry') {
        nextSubStatus = 'qc_check_1';
      } else if (progressStatus === 'qc_check_1') {
        nextSubStatus = 'completed';
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
      : progressStatus === 'wood_procurement'
      ? 'Wood Procurement'
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
      setProgressStatus(nextSubStatus || 'wood_procurement');
      setUpdateNotes('');
      if (progressStatus === 'wood_procurement') {
        alert('Success: Wood procurement completed! Sub-status has auto-advanced to "Under Carpentry".');
      } else if (progressStatus === 'under_carpentry') {
        alert('Success: Under Carpentry completed! Sub-status has auto-advanced to "QC Check 1".');
      } else if (progressStatus === 'qc_check_1') {
        alert('Success: QC Check 1 verified! Sub-status has auto-advanced to "Completed (Carpentry Done)".');
      }
    } else {
      setActiveOrder(null);
      alert(`Success: Staging status saved. Order advanced to "${nextStage}".`);
    }
  };

  if (activeOrder) {
    return (
      <OrderDetailsView
        orderId={activeOrder.id}
        orders={orders}
        users={[]}
        customers={customers}
        statusLogs={statusLogs}
        payments={[]}
        onBack={() => setActiveOrder(null)}
        onUpdateOrder={(updatedOrder, newLog) => {
          setActiveOrder(updatedOrder);
          onUpdateOrder(updatedOrder, newLog);
        }}
        onAddPayment={() => {}}
        currentUser={currentUser}
      />
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
