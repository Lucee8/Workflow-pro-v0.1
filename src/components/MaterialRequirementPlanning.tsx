import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Layers, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  Hammer, 
  ShoppingCart, 
  Lock, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Wrench, 
  ClipboardCheck, 
  FileText, 
  Send,
  Calendar,
  Layers2,
  Bookmark,
  ChevronRight,
  Info,
  Sliders,
  Sparkles,
  RotateCcw,
  Trash2,
  TrendingDown
} from 'lucide-react';
import { Order, Customer, StatusLog } from '../types';
import { db, handleFirestoreError, OperationType } from '../db/firebase';
import { collection, doc, setDoc, onSnapshot, writeBatch } from 'firebase/firestore';

// Types representing master inventory items
interface HardwareItem {
  id: string;
  name: string;
  category: 'Hinges' | 'Handles' | 'Drawer Channels' | 'Screws' | 'Locks' | 'Brackets' | 'Fasteners' | 'Glass Fittings' | 'Other Accessories';
  available_stock: number;
  reserved_stock: number;
  unit: string; // pcs, sets, boxes, kgs
  low_threshold: number;
  unit_cost: number;
  supplier: string;
}

interface WoodItem {
  id: string;
  name: string;
  category: 'Plywood' | 'MDF' | 'HDF' | 'Particle Board' | 'Teak Wood' | 'Oak Wood' | 'Laminate Sheets' | 'Veneers' | 'Solid Wood' | 'Other Custom Materials';
  thickness: string; // e.g. 18mm, 12mm, 3 inches
  grade: string; // e.g. IS:710, Premium, First-Class
  available_stock: number;
  reserved_stock: number;
  unit: string; // sheets, CFT, sqft
  low_threshold: number;
  unit_cost: number;
  supplier: string;
}

interface ProjectBOMItem {
  id: string; // links to master item (either wood_ or hw_)
  name: string;
  type: 'wood' | 'hardware';
  required_qty: number;
  unit: string;
}

// Preseeded default lists for Hardware Master
const PRESEEDED_HARDWARE: HardwareItem[] = [
  { id: 'hw_1', name: 'Concealed Soft-Close Hinges 3D (Clip-on)', category: 'Hinges', available_stock: 140, reserved_stock: 32, unit: 'pcs', low_threshold: 40, unit_cost: 140, supplier: 'Vardhman Hardware Solutions' },
  { id: 'hw_2', name: 'Premium Solid Brass Pull Handles 8"', category: 'Handles', available_stock: 35, reserved_stock: 8, unit: 'pcs', low_threshold: 12, unit_cost: 380, supplier: 'Royal Antique Brass Works' },
  { id: 'hw_3', name: 'Classic Telescopic Soft-Close Drawer Rails 18"', category: 'Drawer Channels', available_stock: 24, reserved_stock: 10, unit: 'sets', low_threshold: 10, unit_cost: 320, supplier: 'Apex Hardware Hub' },
  { id: 'hw_4', name: 'Twin-Thread Self-Drilling Wood Screws 1.5"', category: 'Screws', available_stock: 1800, reserved_stock: 450, unit: 'pcs', low_threshold: 500, unit_cost: 1.5, supplier: 'Metro Fasteners Pvt Ltd' },
  { id: 'hw_5', name: 'Heavy Duty 3-Bolt Wardrobe Sliding Lock set', category: 'Locks', available_stock: 15, reserved_stock: 6, unit: 'pcs', low_threshold: 5, unit_cost: 290, supplier: 'Vardhman Hardware Solutions' },
  { id: 'hw_6', name: 'Sofa Cone Profile Leg Studs (Electroplated Diamond)', category: 'Other Accessories', available_stock: 18, reserved_stock: 8, unit: 'pcs', low_threshold: 16, unit_cost: 190, supplier: 'Royal Antique Brass Works' },
  { id: 'hw_7', name: 'Reinforced Steel Structural Corner Brackets', category: 'Brackets', available_stock: 75, reserved_stock: 12, unit: 'pcs', low_threshold: 20, unit_cost: 48, supplier: 'Metro Fasteners Pvt Ltd' }
];

// Preseeded default lists for Wood Master
const PRESEEDED_WOOD: WoodItem[] = [
  { id: 'wd_1', name: 'Century Premium Waterproof Marine Plywood', category: 'Plywood', thickness: '18mm', grade: 'IS:710 Marine', available_stock: 22, reserved_stock: 8, unit: 'sheets', low_threshold: 6, unit_cost: 2400, supplier: 'Century Ply Corp' },
  { id: 'wd_2', name: 'Action TESA High-Density HDHMR Board', category: 'HDF', thickness: '12mm', grade: 'Premium Water Resistant', available_stock: 14, reserved_stock: 4, unit: 'sheets', low_threshold: 5, unit_cost: 1750, supplier: 'TESA Distributor Co' },
  { id: 'wd_3', name: 'Nagpur Teak Wood Square Rough Logs', category: 'Teak Wood', thickness: 'Rough Sawn (Various)', grade: 'Grade-A Forest Timber', available_stock: 28.5, reserved_stock: 12.0, unit: 'CFT', low_threshold: 10.0, unit_cost: 3450, supplier: 'Central Railway Timber Depot' },
  { id: 'wd_4', name: 'American White Hardwood Oak Beams', category: 'Oak Wood', thickness: '2 inches', grade: 'FAS Premium Premium', available_stock: 8.4, reserved_stock: 2.0, unit: 'CFT', low_threshold: 5.0, unit_cost: 4900, supplier: 'National Exotics Import' },
  { id: 'wd_5', name: 'Gold Gloss Acrylic Finish Laminate Leaf', category: 'Laminate Sheets', thickness: '1mm', grade: 'Gloss Deco S-F', available_stock: 12, reserved_stock: 2, unit: 'sheets', low_threshold: 4, unit_cost: 1150, supplier: 'Royale Touche' }
];

// Default dynamic BOM presets based on category keywords
const BOM_PRESETS: Record<string, Omit<ProjectBOMItem, 'id'>[]> = {
  bed: [
    { name: 'Century Premium Waterproof Marine Plywood', type: 'wood', required_qty: 6, unit: 'sheets' },
    { name: 'Nagpur Teak Wood Square Rough Logs', type: 'wood', required_qty: 8.5, unit: 'CFT' },
    { name: 'Twin-Thread Self-Drilling Wood Screws 1.5"', type: 'hardware', required_qty: 120, unit: 'pcs' },
    { name: 'Reinforced Steel Structural Corner Brackets', type: 'hardware', required_qty: 12, unit: 'pcs' }
  ],
  wardrobe: [
    { name: 'Century Premium Waterproof Marine Plywood', type: 'wood', required_qty: 8, unit: 'sheets' },
    { name: 'Gold Gloss Acrylic Finish Laminate Leaf', type: 'wood', required_qty: 4, unit: 'sheets' },
    { name: 'Concealed Soft-Close Hinges 3D (Clip-on)', type: 'hardware', required_qty: 16, unit: 'pcs' },
    { name: 'Premium Solid Brass Pull Handles 8"', type: 'hardware', required_qty: 4, unit: 'pcs' },
    { name: 'Heavy Duty 3-Bolt Wardrobe Sliding Lock set', type: 'hardware', required_qty: 2, unit: 'pcs' },
    { name: 'Twin-Thread Self-Drilling Wood Screws 1.5"', type: 'hardware', required_qty: 180, unit: 'pcs' }
  ],
  table: [
    { name: 'Nagpur Teak Wood Square Rough Logs', type: 'wood', required_qty: 3.2, unit: 'CFT' },
    { name: 'Gold Gloss Acrylic Finish Laminate Leaf', type: 'wood', required_qty: 1, unit: 'sheets' },
    { name: 'Classic Telescopic Soft-Close Drawer Rails 18"', type: 'hardware', required_qty: 2, unit: 'sets' },
    { name: 'Premium Solid Brass Pull Handles 8"', type: 'hardware', required_qty: 2, unit: 'pcs' },
    { name: 'Twin-Thread Self-Drilling Wood Screws 1.5"', type: 'hardware', required_qty: 40, unit: 'pcs' }
  ],
  sofa: [
    { name: 'Nagpur Teak Wood Square Rough Logs', type: 'wood', required_qty: 4.8, unit: 'CFT' },
    { name: 'Sofa Cone Profile Leg Studs (Electroplated Diamond)', type: 'hardware', required_qty: 4, unit: 'pcs' },
    { name: 'Twin-Thread Self-Drilling Wood Screws 1.5"', type: 'hardware', required_qty: 60, unit: 'pcs' },
    { name: 'Reinforced Steel Structural Corner Brackets', type: 'hardware', required_qty: 8, unit: 'pcs' }
  ]
};

// Simulated Consumption History logs
interface ConsumptionLog {
  id: string;
  itemName: string;
  quantityConsumed: number;
  unit: string;
  orderArticleNo: string;
  timestamp: string;
}

interface MaterialRequirementPlanningProps {
  selectedOrderId: string;
  orders: Order[];
  customers?: Customer[];
  onOrderUpdate?: (updatedOrder: Order, newLog?: StatusLog) => void;
}

export default function MaterialRequirementPlanning({ selectedOrderId, orders, customers = [], onOrderUpdate }: MaterialRequirementPlanningProps) {
  // Navigation tabs: 'dashboard', 'hardware', 'wood', 'consumption'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'hardware' | 'wood'>('dashboard');

  // Master databases loaded from Firestore in real-time
  const [hardwareInventory, setHardwareInventory] = useState<HardwareItem[]>([]);
  const [woodInventory, setWoodInventory] = useState<WoodItem[]>([]);
  const [consumptionLogs, setConsumptionLogs] = useState<ConsumptionLog[]>([]);

  // Current active project chosen for BOM allocation
  const [activeProjectId, setActiveProjectId] = useState<string>(selectedOrderId || (orders.length > 0 ? orders[0].id : ''));
  const [selectedProjectBOM, setSelectedProjectBOM] = useState<ProjectBOMItem[]>([]);
  
  // Custom BOM item adding state
  const [newBomMatName, setNewBomMatName] = useState('');
  const [newBomMatQty, setNewBomMatQty] = useState<number>(1);
  const [newBomMatType, setNewBomMatType] = useState<'wood' | 'hardware'>('wood');
  const [requisitionOutput, setRequisitionOutput] = useState<{ name: string; type: string; shortage: number; unit: string; cost: number }[]>([]);

  // Master creation form states
  const [newHw, setNewHw] = useState<Omit<HardwareItem, 'id'>>({
    name: '', category: 'Hinges', available_stock: 50, reserved_stock: 0, unit: 'pcs', low_threshold: 10, unit_cost: 120, supplier: ''
  });
  const [newWd, setNewWd] = useState<Omit<WoodItem, 'id'>>({
    name: '', category: 'Plywood', thickness: '18mm', grade: 'IS:710', available_stock: 10, reserved_stock: 0, unit: 'sheets', low_threshold: 3, unit_cost: 2200, supplier: ''
  });

  // real-time sync with firestore
  useEffect(() => {
    const unsubHardware = onSnapshot(
      collection(db, 'mrp_hardware'),
      async (snapshot) => {
        if (snapshot.empty) {
          console.log("Seeding mrp_hardware collection in Firestore...");
          const batch = writeBatch(db);
          for (const item of PRESEEDED_HARDWARE) {
            batch.set(doc(db, 'mrp_hardware', item.id), item);
          }
          await batch.commit().catch(err => console.error("Hardware seed failed", err));
        } else {
          const items = snapshot.docs.map(doc => doc.data() as HardwareItem);
          setHardwareInventory(items);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'mrp_hardware');
      }
    );

    const unsubWood = onSnapshot(
      collection(db, 'mrp_wood'),
      async (snapshot) => {
        if (snapshot.empty) {
          console.log("Seeding mrp_wood collection in Firestore...");
          const batch = writeBatch(db);
          for (const item of PRESEEDED_WOOD) {
            batch.set(doc(db, 'mrp_wood', item.id), item);
          }
          await batch.commit().catch(err => console.error("Wood seed failed", err));
        } else {
          const items = snapshot.docs.map(doc => doc.data() as WoodItem);
          setWoodInventory(items);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'mrp_wood');
      }
    );

    const unsubLogs = onSnapshot(
      collection(db, 'mrp_consumption_logs'),
      async (snapshot) => {
        if (snapshot.empty) {
          console.log("Seeding mrp_consumption_logs collection in Firestore...");
          const batch = writeBatch(db);
          const initialLogs: ConsumptionLog[] = [
            { id: 'c_1', itemName: 'Century Premium Waterproof Marine Plywood', quantityConsumed: 4, unit: 'sheets', orderArticleNo: 'ORD-5412', timestamp: '2026-06-01 14:10' },
            { id: 'c_2', itemName: 'Concealed Soft-Close Hinges 3D (Clip-on)', quantityConsumed: 12, unit: 'pcs', orderArticleNo: 'ORD-5412', timestamp: '2026-06-01 14:15' },
            { id: 'c_3', itemName: 'Nagpur Teak Wood Square Rough Logs', quantityConsumed: 3.5, unit: 'CFT', orderArticleNo: 'ORD-9021', timestamp: '2026-05-28 11:40' }
          ];
          for (const log of initialLogs) {
            batch.set(doc(db, 'mrp_consumption_logs', log.id), log);
          }
          await batch.commit().catch(err => console.error("Logs seed failed", err));
        } else {
          const logs = snapshot.docs.map(doc => doc.data() as ConsumptionLog);
          logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          setConsumptionLogs(logs);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'mrp_consumption_logs');
      }
    );

    return () => {
      unsubHardware();
      unsubWood();
      unsubLogs();
    };
  }, []);

  // Sync external order selection
  useEffect(() => {
    if (selectedOrderId) {
      setActiveProjectId(selectedOrderId);
    }
  }, [selectedOrderId]);

  // Dynamic BOM Loader from Firestore with automatic fallback + initial seed
  useEffect(() => {
    if (!activeProjectId) return;
    const project = orders.find(o => o.id === activeProjectId);
    if (!project) return;

    const savedBOMKey = activeProjectId;
    const unsubBOM = onSnapshot(
      doc(db, 'mrp_project_boms', savedBOMKey),
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.items) {
            setSelectedProjectBOM(data.items);
          }
        } else {
          // fallback mapping category names or items to appropriate templates
          const sub = (project.sub_category || '').toLowerCase();
          const cat = (project.category || '').toLowerCase();
          let key = 'bed';

          if (sub.includes('cabinet') || sub.includes('wardrobe') || sub.includes('almirah') || cat.includes('kitchen')) {
            key = 'wardrobe';
          } else if (sub.includes('table') || sub.includes('desk') || sub.includes('dining')) {
            key = 'table';
          } else if (sub.includes('sofa') || sub.includes('chair') || sub.includes('couch')) {
            key = 'sofa';
          }

          const matchedTemplate = BOM_PRESETS[key] || BOM_PRESETS.bed;
          const initialBOM: ProjectBOMItem[] = matchedTemplate.map((item, idx) => ({
            id: `${item.type}_item_${idx}`,
            name: item.name,
            type: item.type,
            required_qty: item.required_qty,
            unit: item.unit
          }));

          setSelectedProjectBOM(initialBOM);
          await setDoc(doc(db, 'mrp_project_boms', savedBOMKey), {
            projectId: savedBOMKey,
            items: initialBOM
          }).catch(err => handleFirestoreError(err, OperationType.WRITE, `mrp_project_boms/${savedBOMKey}`));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `mrp_project_boms/${savedBOMKey}`);
      }
    );

    return () => {
      unsubBOM();
    };
  }, [activeProjectId, orders]);

  // Save changes back to Firestore project storage
  const saveActiveProjectBOM = async (updatedBOM: ProjectBOMItem[]) => {
    setSelectedProjectBOM(updatedBOM);
    if (activeProjectId) {
      try {
        await setDoc(doc(db, 'mrp_project_boms', activeProjectId), {
          projectId: activeProjectId,
          items: updatedBOM
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `mrp_project_boms/${activeProjectId}`);
      }
    }
  };

  // Add Item to Bill Of Materials
  const handleAddBOMItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBomMatName.trim() || newBomMatQty <= 0) return;

    // Match unit with existing master inventory database
    let matchedUnit = 'pcs';
    if (newBomMatType === 'wood') {
      const match = woodInventory.find(w => w.name.toLowerCase().includes(newBomMatName.toLowerCase()));
      matchedUnit = match ? match.unit : 'sheets';
    } else {
      const match = hardwareInventory.find(h => h.name.toLowerCase().includes(newBomMatName.toLowerCase()));
      matchedUnit = match ? match.unit : 'pcs';
    }

    const customBOMItem: ProjectBOMItem = {
      id: `custom_bom_${Date.now()}`,
      name: newBomMatName,
      type: newBomMatType,
      required_qty: newBomMatQty,
      unit: matchedUnit
    };

    const updated = [...selectedProjectBOM, customBOMItem];
    saveActiveProjectBOM(updated);
    setNewBomMatName('');
    setNewBomMatQty(1);
  };

  // Delete Item from Project BOM
  const handleDeleteBOMItem = (id: string) => {
    const updated = selectedProjectBOM.filter(item => item.id !== id);
    saveActiveProjectBOM(updated);
  };

  // Quick helper to search master stocks
  const checkMasterStock = (name: string, type: 'wood' | 'hardware') => {
    if (type === 'wood') {
      const item = woodInventory.find(w => w.name.toLowerCase() === name.toLowerCase());
      return item ? { available: item.available_stock, reserved: item.reserved_stock, item } : null;
    } else {
      const item = hardwareInventory.find(h => h.name.toLowerCase() === name.toLowerCase());
      return item ? { available: item.available_stock, reserved: item.reserved_stock, item } : null;
    }
  };

  // PROJECT STATUS CALCULATION BASED ON INVENTORY
  // "Available", "Partially Available", "Procurement Required", "Ready for Production"
  const getProjectStatus = () => {
    if (selectedProjectBOM.length === 0) return 'No Requirements Registered';
    
    let totalItems = selectedProjectBOM.length;
    let satisfied = 0;
    let criticalOut = 0;

    selectedProjectBOM.forEach(bom => {
      const stock = checkMasterStock(bom.name, bom.type);
      if (stock) {
        const netFree = stock.available - stock.reserved;
        if (netFree >= bom.required_qty) {
          satisfied++;
        } else if (stock.available < bom.required_qty) {
          criticalOut++;
        }
      } else {
        criticalOut++; // Material not configured in stock counts as shortage
      }
    });

    if (criticalOut > 0) return 'Procurement Required';
    if (satisfied === totalItems) return 'Ready for Production';
    return 'Partially Available';
  };

  // AUTO DEDUCTION MECHANICS
  // Automatic stock subtraction after production completion
  const handleAutomaticDeduction = async () => {
    const activeProject = orders.find(o => o.id === activeProjectId);
    const orderNo = activeProject?.article_no || 'Walk-In';

    const batch = writeBatch(db);

    selectedProjectBOM.forEach(bom => {
      if (bom.type === 'wood') {
        const item = woodInventory.find(w => w.name.toLowerCase() === bom.name.toLowerCase());
        if (item) {
          const deductedVal = Math.max(0, item.available_stock - bom.required_qty);
          const logId = `c_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const logData = {
            id: logId,
            itemName: item.name,
            quantityConsumed: bom.required_qty,
            unit: item.unit,
            orderArticleNo: orderNo,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
          };
          batch.set(doc(db, 'mrp_wood', item.id), { ...item, available_stock: Number(deductedVal.toFixed(1)) });
          batch.set(doc(db, 'mrp_consumption_logs', logId), logData);
        }
      } else {
        const item = hardwareInventory.find(h => h.name.toLowerCase() === bom.name.toLowerCase());
        if (item) {
          const deductedVal = Math.max(0, item.available_stock - bom.required_qty);
          const logId = `c_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const logData = {
            id: logId,
            itemName: item.name,
            quantityConsumed: bom.required_qty,
            unit: item.unit,
            orderArticleNo: orderNo,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
          };
          batch.set(doc(db, 'mrp_hardware', item.id), { ...item, available_stock: Math.max(0, item.available_stock - bom.required_qty) });
          batch.set(doc(db, 'mrp_consumption_logs', logId), logData);
        }
      }
    });

    try {
      await batch.commit();

      // Update Stage status safely
      if (activeProject && onOrderUpdate) {
        const updatedOrder = {
          ...activeProject,
          current_status: 'Carpentry' as const, // Transit safely to active Carpentry
          updated_at: new Date().toISOString().slice(0, 10)
        };
        // Emitting status log info
        onOrderUpdate(updatedOrder, {
          id: `log_mrp_${Date.now()}`,
          order_id: activeProject.id,
          stage: 'Carpentry',
          changed_by: 'system',
          changed_by_name: 'MRP Automated System',
          changed_by_role: 'admin',
          timestamp: new Date().toISOString(),
          note: 'Automatic MRP Stock Deduction executed successfully. Wood cutting and accessories issued.'
        });
      }

      alert(`🎉 INVENTORY DEDUCTION COMMITTED!\nSuccessfully subtracted and registered cutting & assembly materials on ${selectedProjectBOM.length} component categories. Cleaned logs have been added to the consumption registry.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'mrp_deduction');
    }
  };

  // STOCK RESERVATION
  const handleReserveProjectStock = async () => {
    const batch = writeBatch(db);

    selectedProjectBOM.forEach(bom => {
      if (bom.type === 'wood') {
        const item = woodInventory.find(w => w.name.toLowerCase() === bom.name.toLowerCase());
        if (item) {
          const potentialReserve = Math.min(item.available_stock, item.reserved_stock + bom.required_qty);
          batch.set(doc(db, 'mrp_wood', item.id), { ...item, reserved_stock: Number(potentialReserve.toFixed(1)) });
        }
      } else {
        const item = hardwareInventory.find(h => h.name.toLowerCase() === bom.name.toLowerCase());
        if (item) {
          const potentialReserve = Math.min(item.available_stock, item.reserved_stock + bom.required_qty);
          batch.set(doc(db, 'mrp_hardware', item.id), { ...item, reserved_stock: potentialReserve });
        }
      }
    });

    try {
      await batch.commit();
      alert(`🔐 MATERIALS RESERVATION COMPLETE!\nWe have successfully reserved in-stock materials exclusively for Project Room allocation. This protects items against other active walk-in orders.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'mrp_reservation');
    }
  };

  // AUTOMATIC CALCULATED REQUISITIONS
  const handleGeneratePurchaseRequisition = () => {
    const list: typeof requisitionOutput = [];

    selectedProjectBOM.forEach(bom => {
      const stock = checkMasterStock(bom.name, bom.type);
      if (stock) {
        const netFree = stock.available - stock.reserved;
        if (netFree < bom.required_qty) {
          const shortage = bom.required_qty - netFree;
          list.push({
            name: bom.name,
            type: bom.type,
            shortage: Number(shortage.toFixed(1)),
            unit: bom.unit,
            cost: Number((shortage * stock.item.unit_cost).toFixed(0))
          });
        }
      } else {
        // Not configured in master, estimate normal value
        list.push({
          name: bom.name,
          type: bom.type,
          shortage: bom.required_qty,
          unit: bom.unit,
          cost: bom.type === 'wood' ? bom.required_qty * 1800 : bom.required_qty * 150
        });
      }
    });

    setRequisitionOutput(list);
  };

  // Master lists item handlers
  const handleAddMasterHardware = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHw.name.trim()) return;

    const added: HardwareItem = {
      ...newHw,
      id: `hw_custom_${Date.now()}`
    };

    try {
      await setDoc(doc(db, 'mrp_hardware', added.id), added);
      setNewHw({ name: '', category: 'Hinges', available_stock: 50, reserved_stock: 0, unit: 'pcs', low_threshold: 10, unit_cost: 120, supplier: '' });
      alert('✅ Hardware master item created.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `mrp_hardware/${added.id}`);
    }
  };

  const handleAddMasterWood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWd.name.trim()) return;

    const added: WoodItem = {
      ...newWd,
      id: `wood_custom_${Date.now()}`
    };

    try {
      await setDoc(doc(db, 'mrp_wood', added.id), added);
      setNewWd({ name: '', category: 'Plywood', thickness: '18mm', grade: 'IS:710', available_stock: 10, reserved_stock: 0, unit: 'sheets', low_threshold: 3, unit_cost: 2200, supplier: '' });
      alert('✅ Wood master item created.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `mrp_wood/${added.id}`);
    }
  };

  // Dashboard Aggregates
  const totalHwStockCount = hardwareInventory.reduce((acc, h) => acc + h.available_stock, 0);
  const totalWoodStockCount = woodInventory.reduce((acc, w) => acc + w.available_stock, 0);
  
  // Inventory financial evaluation
  const hwInventoryValue = hardwareInventory.reduce((acc, h) => acc + (h.available_stock * h.unit_cost), 0);
  const woodInventoryValue = woodInventory.reduce((acc, w) => acc + (w.available_stock * w.unit_cost), 0);
  const totalValue = hwInventoryValue + woodInventoryValue;

  // Calculate alert counts
  const hwLowCount = hardwareInventory.filter(h => h.available_stock <= h.low_threshold).length;
  const woodLowCount = woodInventory.filter(w => w.available_stock <= w.low_threshold).length;
  const totalAlertCount = hwLowCount + woodLowCount;

  // Identify active order products
  const activeProjectObj = orders.find(o => o.id === activeProjectId);

  return (
    <div className="bg-[#fbfcfa] border border-[#593622]/20 rounded-2xl p-6 space-y-6 shadow-sm print:hidden">
      
      {/* MRP HEADER BRANDING */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#593622]/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#593622] text-amber-200">
              <Boxes size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="bg-amber-100/80 text-[#593622] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest block w-max">
                ERP Integrated Workshop
              </span>
              <h2 className="text-xl font-black text-[#593622] tracking-tight font-display mt-0.5 uppercase leading-none">
                Material Requirement Planning (MRP) Dashboard
              </h2>
            </div>
          </div>
          <p className="text-xs text-stone-500 mt-1 font-sans">
            Streamline cabinet-making wood volumes, timber logs estimation, custom hinges, sliding handles & accessories inventory.
          </p>
        </div>

        {/* Global Tab Switchers */}
        <div className="flex bg-stone-150 p-1 rounded-xl border self-start lg:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'dashboard' ? 'bg-[#593622] text-white shadow-xs' : 'text-stone-500 hover:text-stone-850'
            }`}
          >
            📊 Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'hardware' ? 'bg-[#593622] text-white shadow-xs' : 'text-stone-500 hover:text-stone-850'
            }`}
          >
            ⚙️ Hardware Master
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wood')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'wood' ? 'bg-[#593622] text-white shadow-xs' : 'text-stone-500 hover:text-stone-850'
            }`}
          >
            🪵 Wood &amp; Boards Master
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* TOP COUNTERS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Hardware Stock count */}
            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Total Hardware Units</span>
                <strong className="text-2xl font-black text-stone-900 block mt-1">{totalHwStockCount} <span className="text-xs font-normal text-stone-500">pcs/sets</span></strong>
                <span className="text-[10px] text-stone-500 font-sans block mt-0.5">Asset Value: ₹{hwInventoryValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-amber-900 border border-amber-200">
                <Wrench size={18} />
              </div>
            </div>

            {/* Total Wood Stock count */}
            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Total Wood Inventory</span>
                <strong className="text-2xl font-black text-stone-900 block mt-1">{totalWoodStockCount} <span className="text-xs font-normal text-stone-500">units</span></strong>
                <span className="text-[10px] text-stone-500 font-sans block mt-0.5">Asset Value: ₹{woodInventoryValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 bg-stone-100 rounded-xl text-stone-800 border border-stone-300">
                <Hammer size={18} />
              </div>
            </div>

            {/* Low-stock alerted materials */}
            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Low-Stock Warnings</span>
                <strong className={`text-2xl font-black block mt-1 ${totalAlertCount > 0 ? 'text-red-700 font-black animate-pulse' : 'text-[#593622]'}`}>
                  {totalAlertCount} <span className="text-xs font-normal text-stone-450">Alerts active</span>
                </strong>
                <span className="text-[10px] text-red-650 font-bold block mt-0.5">{hwLowCount} HW &bull; {woodLowCount} Wood Rows</span>
              </div>
              <div className={`p-3 rounded-xl border ${totalAlertCount > 0 ? 'bg-red-50 text-red-800 border-red-200' : 'bg-stone-50 text-stone-400'}`}>
                <AlertCircle size={18} />
              </div>
            </div>

            {/* General valuation */}
            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Total Inventory Value</span>
                <strong className="text-2xl font-black text-[#69422a] block mt-1">₹{totalValue.toLocaleString('en-IN')}</strong>
                <span className="text-[10px] text-[#593622]/70 font-semibold block mt-0.5">Overall Material Valuation</span>
              </div>
              <div className="p-3 bg-[#593622]/10 rounded-xl text-[#593622] border border-[#593622]/20">
                <DollarSign size={18} />
              </div>
            </div>
            
          </div>

          {/* TWO PANEL REPORT: LOW STOCK & RECENT CONSUMPTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Low Stock Watchlist */}
            <div className="bg-white p-5 border border-stone-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase text-[#593622] flex items-center gap-1.5">
                    🚨 Low Stock Alerts Watchlist
                  </h3>
                  <p className="text-[10px] text-stone-400 mt-0.5">Critical restock thresholds crossed or reached</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-red-105 border border-red-200 text-red-700 rounded-lg uppercase font-bold">
                  Refill Needed
                </span>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[280px]">
                {hardwareInventory.filter(h => h.available_stock <= h.low_threshold).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50/30 rounded-xl border border-red-100 text-xs">
                    <div>
                      <strong className="text-stone-900 block">{item.name}</strong>
                      <span className="text-[10px] text-stone-400 font-sans block mt-0.5">Hardware / Category: {item.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-red-700 block font-mono">Stock: {item.available_stock} {item.unit}</span>
                      <span className="text-[9px] text-stone-450 block font-sans">Min Limit: {item.low_threshold}</span>
                    </div>
                  </div>
                ))}

                {woodInventory.filter(w => w.available_stock <= w.low_threshold).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50/30 rounded-xl border border-red-100 text-xs">
                    <div>
                      <strong className="text-stone-900 block">{item.name}</strong>
                      <span className="text-[10px] text-stone-400 font-sans block mt-0.5">Wood / Grade: {item.grade} &bull; {item.thickness}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-red-700 block font-mono">Stock: {item.available_stock} {item.unit}</span>
                      <span className="text-[9px] text-stone-450 block font-sans">Min Limit: {item.low_threshold}</span>
                    </div>
                  </div>
                ))}

                {hardwareInventory.filter(h => h.available_stock <= h.low_threshold).length === 0 &&
                 woodInventory.filter(w => w.available_stock <= w.low_threshold).length === 0 && (
                  <div className="p-8 text-center text-stone-450 italic text-xs font-sans">
                    ✨ No materials are below stock thresholds. Your inventory levels are optimal!
                  </div>
                )}
              </div>
            </div>

            {/* Material Consumption Report */}
            <div className="bg-white p-5 border border-stone-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase text-[#593622] flex items-center gap-1.5">
                    🪵 Material Cutting &amp; Consumption History
                  </h3>
                  <p className="text-[10px] text-stone-400 mt-0.5">Recorded items issued for project assembly and sawing</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#593622]/10 text-[#593622] rounded-lg uppercase font-bold">
                  Real-time Logs
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[280px]">
                {consumptionLogs.map(log => (
                  <div key={log.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-xs flex items-center justify-between">
                    <div>
                      <strong className="text-stone-900 font-bold block">{log.itemName}</strong>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] px-1 bg-stone-200 rounded text-stone-600 font-mono">Order: {log.orderArticleNo}</span>
                        <span className="text-[10px] text-stone-405 font-medium">{log.timestamp}</span>
                      </div>
                    </div>
                    <div className="font-mono text-stone-950 font-black text-right">
                      -{log.quantityConsumed} {log.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ACTIVE PROJECTS OUTLOOK */}
          <div className="bg-[#593622]/5 p-5 border border-[#593622]/15 rounded-2xl space-y-3">
            <h3 className="text-xs font-black uppercase text-[#593622] tracking-wider flex items-center gap-1.5">
              📋 Active Workshop Projects ({orders.length} orders loaded)
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Active workshop furniture projects currently being processed in production.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {orders.map(o => (
                <div
                  key={o.id}
                  className="bg-white border p-2 rounded-xl text-[11px] font-bold text-stone-800 flex items-center gap-2 shadow-2xs"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  <strong>{o.article_no}</strong>: {o.sub_category}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: HARDWARE MASTER INVENTORY */}
      {activeTab === 'hardware' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold uppercase text-[#593622]">🛠️ Master Hardware Inventory Database</h3>
              <p className="text-[11px] text-stone-400 mt-0.5">Add, edit, or adjust safety thresholds of accessories</p>
            </div>
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b text-stone-500 font-bold uppercase text-[9px] tracking-wider select-none">
                    <th className="py-2.5 px-4">Item Name / Specification</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Available Stock</th>
                    <th className="py-2.5 px-3 text-center">Reserved Stock</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate</th>
                    <th className="py-2.5 px-4 text-center">Supplier</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-150 font-semibold text-stone-800">
                  {hardwareInventory.map(item => {
                    const isLow = item.available_stock <= item.low_threshold;
                    return (
                      <tr key={item.id} className="hover:bg-amber-50/5">
                        <td className="py-2.5 px-4 text-stone-900 font-black text-xs">{item.name}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-600 text-[10px] uppercase font-bold">{item.category}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            value={item.available_stock}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setHardwareInventory(current => current.map(x => x.id === item.id ? { ...x, available_stock: val } : x));
                            }}
                            className="w-16 bg-stone-50 border p-1 rounded font-mono font-bold text-[#593622] text-center"
                          />
                          <span className="text-[10px] text-stone-400 font-sans block mt-0.5">{item.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-stone-500">{item.reserved_stock} {item.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-stone-900">₹{item.unit_cost}</td>
                        <td className="py-2.5 px-4 text-stone-500 font-normal">{item.supplier || 'Local Supplier'}</td>
                        <td className="py-2.5 px-3 text-center">
                          {isLow ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded-full text-[10px] font-black tracking-wide shrink-0 animate-pulse">
                              ⚠️ LOW STOCK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-250 rounded-full text-[10px] font-black tracking-wide shrink-0">
                              ✓ ADEQUATE
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${item.name} from Master Hardware?`)) {
                                setHardwareInventory(prev => prev.filter(x => x.id !== item.id));
                              }
                            }}
                            className="p-1 text-stone-400 hover:text-red-700 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MASTER HARDWARE CREATION FORM */}
          <form onSubmit={handleAddMasterHardware} className="bg-white border rounded-2xl p-5 space-y-4 shadow-3xs">
            <h4 className="text-xs font-black uppercase text-[#593622] tracking-wider flex items-center gap-1">
              <Plus size={14} /> Insert New Hardware Master Item
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Hardware Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Telescopic slides 20 inch"
                  value={newHw.name}
                  onChange={(e) => setNewHw({ ...newHw, name: e.target.value })}
                  className="w-full bg-stone-50 border p-2 rounded-lg font-semibold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Category</label>
                <select
                  value={newHw.category}
                  onChange={(e: any) => setNewHw({ ...newHw, category: e.target.value })}
                  className="w-full bg-stone-50 border p-2 rounded-lg text-stone-900 font-bold focus:outline-none"
                >
                  <option value="Hinges">Hinges</option>
                  <option value="Handles">Handles</option>
                  <option value="Drawer Channels">Drawer Channels</option>
                  <option value="Screws">Screws</option>
                  <option value="Locks">Locks</option>
                  <option value="Brackets">Brackets</option>
                  <option value="Fasteners">Fasteners</option>
                  <option value="Glass Fittings">Glass Fittings</option>
                  <option value="Other Accessories">Other Accessories</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Starting Stock Qty</label>
                <input
                  type="number"
                  required
                  value={newHw.available_stock}
                  onChange={(e) => setNewHw({ ...newHw, available_stock: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-stone-50 border p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-stone-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Hardware Unit</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. pcs, sets, boxes"
                  value={newHw.unit}
                  onChange={(e) => setNewHw({ ...newHw, unit: e.target.value })}
                  className="w-full bg-stone-50 border p-2 rounded-lg text-stone-900 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Alert Threshold Limit</label>
                <input
                  type="number"
                  required
                  value={newHw.low_threshold}
                  onChange={(e) => setNewHw({ ...newHw, low_threshold: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-stone-50 border p-2 rounded-lg text-stone-900 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Estimated Unit Rate (₹)</label>
                <input
                  type="number"
                  required
                  value={newHw.unit_cost}
                  onChange={(e) => setNewHw({ ...newHw, unit_cost: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-stone-50 border p-2 rounded-lg font-bold text-stone-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Registered Supplier</label>
                <input
                  type="text"
                  placeholder="e.g. Vardhman Fasteners"
                  value={newHw.supplier}
                  onChange={(e) => setNewHw({ ...newHw, supplier: e.target.value })}
                  className="w-full bg-stone-50 border p-2 rounded-lg text-stone-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-[#593622] hover:bg-[#402414] text-white rounded-xl text-xs font-black uppercase tracking-wider transition"
            >
              Add Item to master list
            </button>
          </form>

        </div>
      )}

      {/* TAB 3: WOOD & BOARDS MASTER INVENTORY */}
      {activeTab === 'wood' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold uppercase text-[#593622]">🪵 Master Wood &amp; Panel Sheets Inventory Database</h3>
              <p className="text-[11px] text-stone-400 mt-0.5">Manage teak timber, oak, HDHMR sheets, thickness standards and suppliers</p>
            </div>
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b text-stone-500 font-bold uppercase text-[9px] tracking-wider select-none font-sans">
                    <th className="py-2.5 px-4">Item Name / Timber Type</th>
                    <th className="py-2.5 px-3">Grade</th>
                    <th className="py-2.5 px-2">Thickness</th>
                    <th className="py-2.5 px-3 text-center">Available Stock</th>
                    <th className="py-2.5 px-3 text-center">Reserved Stock</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-4 text-center">Manufacturer / Supplier</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-150 font-semibold text-stone-800">
                  {woodInventory.map(item => {
                    const isLow = item.available_stock <= item.low_threshold;
                    return (
                      <tr key={item.id} className="hover:bg-amber-50/5">
                        <td className="py-2.5 px-4 text-stone-900 font-black text-xs">
                          <div>
                            <span>{item.name}</span>
                            <span className="block text-[9px] text-[#593622] font-black">{item.category}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">{item.grade}</td>
                        <td className="py-2.5 px-2 font-mono text-[11px] text-stone-605">{item.thickness}</td>
                        <td className="py-2.5 px-3 text-center animate-fade-in">
                          <input
                            type="number"
                            step="0.1"
                            value={item.available_stock}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setWoodInventory(current => current.map(x => x.id === item.id ? { ...x, available_stock: val } : x));
                            }}
                            className="w-16 bg-stone-50 border p-1 rounded font-mono font-bold text-[#593622] text-center"
                          />
                          <span className="text-[10px] text-stone-400 block mt-0.5">{item.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-stone-500">{item.reserved_stock} {item.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-stone-900">₹{item.unit_cost}</td>
                        <td className="py-2.5 px-4 text-stone-500 font-normal">{item.supplier || 'Timber Wholesalers'}</td>
                        <td className="py-2.5 px-3 text-center">
                          {isLow ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded-full text-[10px] font-black tracking-wide shrink-0 animate-pulse">
                              ⚠️ LOW STOCK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-250 rounded-full text-[10px] font-black tracking-wide shrink-0">
                              ✓ ADEQUATE
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-normal">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${item.name} from Master Wood Database?`)) {
                                setWoodInventory(prev => prev.filter(x => x.id !== item.id));
                              }
                            }}
                            className="p-1 text-stone-400 hover:text-red-700 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MASTER WOOD CREATION FORM */}
          <form onSubmit={handleAddMasterWood} className="bg-white border rounded-2xl p-5 space-y-4 shadow-3xs">
            <h4 className="text-xs font-black uppercase text-[#593622] tracking-wider flex items-center gap-1">
              <Plus size={14} /> Configure New Master Timber / board Plank Item
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Timber or Panel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Teak Log 3x4 Beams"
                  value={newWd.name}
                  onChange={(e) => setNewWd({ ...newWd, name: e.target.value })}
                  className="w-full bg-stone-50 border p-2 rounded-lg font-semibold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#593622] uppercase mb-1 font-black">Wood Category</label>
                <select
                  value={newWd.category}
                  onChange={(e: any) => setNewWd({ ...newWd, category: e.target.value })}
                  className="w-full bg-stone-50 border p-2 rounded-lg text-stone-900 font-black focus:outline-none"
                >
                  <option value="Plywood">Plywood</option>
                  <option value="MDF">MDF</option>
                  <option value="HDF">HDF</option>
                  <option value="Particle Board">Particle Board</option>
                  <option value="Teak Wood">Teak Wood</option>
                  <option value="Oak Wood">Oak Wood</option>
                  <option value="Laminate Sheets">Laminate Sheets</option>
                  <option value="Veneers">Veneers</option>
                  <option value="Solid Wood">Solid Wood</option>
                  <option value="Other Custom Materials">Other Custom Materials</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Thickness Indicator</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 18mm, 12mm, 4 inches"
                  value={newWd.thickness}
                  onChange={(e) => setNewWd({ ...newWd, thickness: e.target.value })}
                  className="w-full bg-stone-50 border p-2 rounded-lg focus:ring-1 focus:ring-amber-500 text-stone-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Wood Grade Standards</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IS:710 Marine, AAA Seasoned"
                  value={newWd.grade}
                  onChange={(e) => setNewWd({ ...newWd, grade: e.target.value })}
                  className="w-full bg-stone-50 border p-2 rounded-lg text-stone-900 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs pt-1">
              <div>
                <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Stock Vol</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newWd.available_stock}
                  onChange={(e) => setNewWd({ ...newWd, available_stock: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-stone-50 border p-2 rounded-lg text-stone-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Wood Unit</label>
                <select
                  value={newWd.unit}
                  onChange={(e) => setNewWd({ ...newWd, unit: e.target.value })}
                  className="w-full bg-stone-50 border p-2 rounded-lg text-stone-900 font-semibold"
                >
                  <option value="sheets">sheets</option>
                  <option value="CFT">CFT (Cubic Feet)</option>
                  <option value="sqft">sqft</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Low-Limit limit</label>
                <input
                  type="number"
                  required
                  value={newWd.low_threshold}
                  onChange={(e) => setNewWd({ ...newWd, low_threshold: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-stone-50 border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Procurement Unit Cost (₹)</label>
                <input
                  type="number"
                  required
                  value={newWd.unit_cost}
                  onChange={(e) => setNewWd({ ...newWd, unit_cost: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-stone-50 border p-2 rounded-lg font-black text-stone-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-[#593622] hover:bg-[#402414] text-white rounded-xl text-xs font-black uppercase tracking-wider transition"
            >
              Add Item to master database
            </button>
          </form>

        </div>
      )}



    </div>
  );
}
