/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
//routing-map.tsx
"use client";

import type L from "leaflet";
import type { LatLngExpression, Map as LeafletMap, PathOptions } from "leaflet";
import type { MouseEventHandler } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  Circle,
  GeoJSON,
  LayersControl,
  LayerGroup as LeafletLayerGroup,
  MapContainer,
  TileLayer,
} from "react-leaflet";

import "~/styles/geosearch.css";
import "~/styles/leaflet.css";

import { MAP_DATA } from "~/data/map-data";
import { useClient } from "~/providers/client";
import { useDriver } from "~/providers/driver";

import type { Coordinates, GeoJsonData } from "~/types/geolocation";
import { getStyle } from "~/utils/generic/color-handling";
import { cuidToIndex } from "~/utils/generic/format-utils.wip";
import { formatGeometryString } from "~/lib/optimization/vroom-optimization";
import { pusherClient } from "~/lib/soketi/client";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDepot } from "~/hooks/depot/use-depot";
import { useLasso } from "~/hooks/maps/use-lasso";
import { useMapGraphics } from "~/hooks/maps/use-map-points";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import useMap from "~/hooks/use-map";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { MapPopup } from "~/components/map/map-popup";
import { RouteMarker } from "~/components/map/route-marker";
import { MapViewButton } from "./map-view-button";
import type { VendingMachine, VendingMachineLevel, EnhancedVendingMachine } from "~/types/vendingMachine";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ChevronLeft, Eye, Save, X } from "lucide-react";

type VendingMachineView = 'machines' | 'levels' | 'compartments' | 'remote';

type Props = {
  className?: string;
  children?: React.ReactNode;
};

interface MapRef {
  reactLeafletMap: LeafletMap | null;
}

type CoordMap = Record<string, { lat: number; lng: number }>;

const RoutingMap = forwardRef<MapRef, Props>(({ className }, ref) => {
  const { routeId, depotId } = useSolidarityState();
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "vehicle", "routePlan", "job", "customer"],
  });
  
  const apiContext = api.useUtils();
  const mapRef = useRef<LeafletMap>(null);
  
  const [latLng, setLatLng] = useState<L.LatLng | null>(null);
  const [activeDrivers, setActiveDrivers] = useState<CoordMap>({});
  const [selectedVendingMachine, setSelectedVendingMachine] = useState<EnhancedVendingMachine | null>(null);
  const [currentView, setCurrentView] = useState<VendingMachineView>('machines');
  const [selectedLevel, setSelectedLevel] = useState<VendingMachineLevel | null>(null);
  const [isRemoteViewer, setIsRemoteViewer] = useState(false);
  const [newName, setNewName] = useState<string>("");
  const [editedInventory, setEditedInventory] = useState<Record<string, number>>({});
  
  const { setSelectedJobIds, selectedJobIds } = useClient();
  const { currentDepot } = useDepot();
  const { activeDriverData } = useDriver();
  const { activeJobData } = useClient();

  useEffect(() => {
    if (selectedVendingMachine) {
      setNewName(selectedVendingMachine.name ?? "");
      setEditedInventory(selectedVendingMachine.inventory ?? {});
    }
  }, [selectedVendingMachine]);

  const params = useMemo(() => ({
    mapRef: mapRef.current!,
    trackingEnabled: true,
    constantUserTracking: true,
    activeDriverData,
    activeJobData,
  }), [activeDriverData, activeJobData]);

  const { currentLocation } = useMap(params);
  const { findVehicleById } = useDriver();

  const createVehicleBundle = api.driver.createByLatLng.useMutation(defaultActions);
  const createJobBundle = api.job.createByLatLng.useMutation(defaultActions);
  const createVendingMachine = api.vendingMachine.create.useMutation({
    onSuccess: async () => {
      await apiContext.vendingMachine.getAll.invalidate();
    },
    onError: (error) => {
      console.error("Failed to create vending machine:", error);
    },
  });
  
  const getVendingMachines = api.vendingMachine.getAll.useQuery(undefined, {
    enabled: true,
  });
  
  const updateVendingMachine = api.vendingMachine.update.useMutation({
    onSuccess: async () => {
      await apiContext.vendingMachine.getAll.invalidate();
    },
    onError: (error) => {
      console.error("Failed to update vending machine:", error);
    },
  });

  const addDriverByLatLng = useCallback(async ({ latitude, longitude }: Coordinates) => {
    try {
      await createVehicleBundle.mutateAsync({
        latitude,
        longitude,
        depotId,
        routeId,
      });
    } catch (error) {
      console.error("Failed to add driver:", error);
    }
  }, [createVehicleBundle, depotId, routeId]);

  const addJobByLatLng = useCallback(async ({ latitude, longitude }: Coordinates) => {
    try {
      await createJobBundle.mutateAsync({
        latitude,
        longitude,
        depotId,
        routeId,
      });
    } catch (error) {
      console.error("Failed to add job:", error);
    }
  }, [createJobBundle, depotId, routeId]);

  const addVendingMachineByLatLng = useCallback(async ({ latitude, longitude }: Coordinates) => {
    try {
      await createVendingMachine.mutateAsync({
        name: "New Vending Machine",
        coordinates: { latitude, longitude },
        address: undefined,
        inventory: {},
      });
    } catch (error) {
      console.error("Failed to add vending machine:", error);
    }
  }, [createVendingMachine]);
  
  useImperativeHandle(ref, () => ({
    reactLeafletMap: mapRef.current,
  }));

  const handleRightClick = useCallback((event: MouseEvent) => {
    if (!mapRef.current) return;
    setLatLng(mapRef.current.mouseEventToLatLng(event));
  }, []);

  const mapGraphics = useMapGraphics({
    setSelectedJobIds,
    selectedJobIds,
  });

  useLasso({
    mapRef,
    setSelectedJobIds,
    selectedJobIds,
    assignedMapPointsLength: mapGraphics.assignedMapPoints.length,
  });

  const updateActiveDriverLocations = useCallback((obj: {
    vehicleId: string;
    latitude: number;
    longitude: number;
  }) => {
    setActiveDrivers((prevCoordMap) => ({
      ...prevCoordMap,
      [obj.vehicleId]: {
        lat: obj.latitude,
        lng: obj.longitude,
      },
    }));
  }, []);

  const useThisCenter: L.LatLngExpression = useMemo(() => {
    if (currentDepot?.address?.latitude && currentDepot?.address?.longitude) {
      return [
        currentDepot.address.latitude,
        currentDepot.address.longitude,
      ] as L.LatLngTuple;  // 明确指定为经纬度元组
    }
    return MAP_DATA.center as L.LatLngTuple;  // 确保默认值也是正确类型
  }, [currentDepot]);

  useEffect(() => {
    pusherClient.subscribe("map");
    pusherClient.bind("evt::clear-route", mapGraphics.handleClearRoute);
    pusherClient.bind("evt::update-location", updateActiveDriverLocations);

    return () => {
      pusherClient.unsubscribe("map");
    };
  }, [mapGraphics.handleClearRoute, updateActiveDriverLocations]);

  const generateMockLevels = useCallback((machineId: string): VendingMachineLevel[] => {
    const levelCount = 8;
    return Array.from({ length: levelCount }, (_, index) => {
      const levelId = levelCount - index;
      const compartmentCount = Math.random() > 0.5 ? 6 : 8;
      const products: Record<number, { productName: string; quantity: number; maxCapacity: number }> = {};
      
      for (let i = 1; i <= compartmentCount; i++) {
        const productNames = ['Coca Cola', 'Pepsi', 'Water', 'Coffee', 'Tea', 'Orange Juice', 'Chips', 'Cookies'];
        const maxCapacity = 20;
        const quantity = Math.floor(Math.random() * (maxCapacity + 1));
        
        if (Math.random() > 0.2) {
          products[i] = {
            productName: productNames[Math.floor(Math.random() * productNames.length)] ?? 'Unknown',
            quantity,
            maxCapacity
          };
        } else {
          products[i] = {
            productName: '',
            quantity: 0,
            maxCapacity
          };
        }
      }
      
      const avgFillRate = Object.values(products).reduce((sum, p) => sum + (p.quantity / p.maxCapacity), 0) / compartmentCount;
      let stockStatus: 'empty' | 'low' | 'medium' | 'full';
      if (avgFillRate < 0.1) stockStatus = 'empty';
      else if (avgFillRate < 0.3) stockStatus = 'low';
      else if (avgFillRate < 0.7) stockStatus = 'medium';
      else stockStatus = 'full';
      
      return {
        id: levelId,
        compartments: compartmentCount,
        stockStatus,
        products
      };
    });
  }, []);

  const calculateStockStatus = useCallback((products: Record<number, { productName: string; quantity: number; maxCapacity: number }>): 'empty' | 'low' | 'medium' | 'full' => {
    const compartments = Object.values(products);
    if (compartments.length === 0) return 'empty';
    
    const avgFillRate = compartments.reduce((sum, product) => {
      return sum + (product.quantity / product.maxCapacity);
    }, 0) / compartments.length;
    
    if (avgFillRate < 0.1) return 'empty';
    if (avgFillRate < 0.3) return 'low';
    if (avgFillRate < 0.7) return 'medium';
    return 'full';
  }, []);

  const CircularLevelIndicator = ({ 
    level, 
    size = 80, 
    onClick,
    showDetails = false
  }: { 
    level: VendingMachineLevel; 
    size?: number; 
    onClick?: () => void;
    showDetails?: boolean;
  }) => {
    const radius = size / 2 - 4;
    const center = size / 2;
    const compartments = level.compartments;
    
    const getStockColor = (fillRate: number) => {
      if (fillRate < 0.1) return '#ef4444';
      if (fillRate < 0.3) return '#f59e0b';
      if (fillRate < 0.7) return '#eab308';
      return '#22c55e';
    };

    const getBorderColor = (status: string) => {
      switch (status) {
        case 'empty': return '#dc2626';
        case 'low': return '#ea580c';
        case 'medium': return '#ca8a04';
        case 'full': return '#16a34a';
        default: return '#6b7280';
      }
    };
    
    const segments = Array.from({ length: compartments }, (_, index) => {
      const angle = (360 / compartments) * index;
      const nextAngle = (360 / compartments) * (index + 1);
      const product = level.products[index + 1];
      const fillRate = product ? product.quantity / product.maxCapacity : 0;
      
      const startAngleRad = (angle - 90) * (Math.PI / 180);
      const endAngleRad = (nextAngle - 90) * (Math.PI / 180);
      
      const x1 = center + Math.cos(startAngleRad) * radius;
      const y1 = center + Math.sin(startAngleRad) * radius;
      const x2 = center + Math.cos(endAngleRad) * radius;
      const y2 = center + Math.sin(endAngleRad) * radius;
      
      const largeArc = (nextAngle - angle) > 180 ? 1 : 0;
      
      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
      
      return (
        <g key={index}>
          <path
            d={pathData}
            fill={getStockColor(fillRate)}
            stroke="#ffffff"
            strokeWidth="1.5"
            opacity={fillRate > 0 ? 1 : 0.3}
            className={onClick ? 'hover:opacity-80 cursor-pointer' : ''}
          />
          {showDetails && size > 120 && (
            <text
              x={center + Math.cos((startAngleRad + endAngleRad) / 2) * (radius * 0.7)}
              y={center + Math.sin((startAngleRad + endAngleRad) / 2) * (radius * 0.7)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-white font-semibold"
              style={{ fontSize: '8px' }}
            >
              {index + 1}
            </text>
          )}
        </g>
      );
    });

    const totalProducts = Object.values(level.products).reduce((sum, p) => sum + p.quantity, 0);
    const totalCapacity = Object.values(level.products).reduce((sum, p) => sum + p.maxCapacity, 0);
    const fillPercentage = totalCapacity > 0 ? Math.round((totalProducts / totalCapacity) * 100) : 0;
    
    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg 
            width={size} 
            height={size} 
            className={`${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
            onClick={onClick}
          >
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={getBorderColor(level.stockStatus)}
              strokeWidth="3"
            />
            {segments}
            <circle
              cx={center}
              cy={center}
              r={radius * 0.35}
              fill="white"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text
              x={center}
              y={center - (showDetails ? 4 : 0)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm font-bold fill-gray-700"
            >
              {level.id}
            </text>
            {showDetails && (
              <text
                x={center}
                y={center + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-gray-600"
              >
                {fillPercentage}%
              </text>
            )}
          </svg>
          
          <div 
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              level.stockStatus === 'full' ? 'bg-green-500' :
              level.stockStatus === 'medium' ? 'bg-yellow-500' :
              level.stockStatus === 'low' ? 'bg-orange-500' : 'bg-red-500'
            }`}
          />
        </div>
        
        <div className="text-center mt-2">
          <span className="text-xs font-medium text-gray-700">
            Level {level.id}
          </span>
          <div className="text-xs text-gray-500">
            {level.compartments} compartments
          </div>
          {showDetails && (
            <div className="text-xs text-gray-400">
              {totalProducts}/{totalCapacity}
            </div>
          )}
        </div>
      </div>
    );
  };

  const MachineSelectionView = () => {
    const machines = getVendingMachines.data ?? [];
    
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Select Vending Machine</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRemoteViewer(!isRemoteViewer)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {isRemoteViewer ? 'Manage Mode' : 'View Mode'}
          </Button>
        </div>
        
        <div className="grid gap-4">
          {machines.map((machine) => (
            <div
              key={machine.id}
              className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all"
              onClick={() => {
                const enhancedMachine: EnhancedVendingMachine = {
                  ...machine,
                  levels: generateMockLevels(machine.id)
                };
                setSelectedVendingMachine(enhancedMachine);
                setCurrentView('levels');
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg text-gray-800">
                    {machine.name ?? 'Unnamed Machine'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {machine.address ?? 'Address not set'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronLeft className="h-5 w-5 text-gray-400 rotate-180" />
                </div>
              </div>
            </div>
          ))}
          
          {machines.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-lg font-medium">No vending machines</div>
              <div className="text-sm mt-1">Add machines on the map first</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const LevelsOverviewView = () => {
    if (!selectedVendingMachine?.levels) return null;
    
    const totalLevels = selectedVendingMachine.levels.length;
    const totalCompartments = selectedVendingMachine.levels.reduce((sum, level) => sum + level.compartments, 0);
    const totalProducts = selectedVendingMachine.levels.reduce((sum, level) => {
      return sum + Object.values(level.products).reduce((levelSum, product) => levelSum + product.quantity, 0);
    }, 0);
    const totalCapacity = selectedVendingMachine.levels.reduce((sum, level) => {
      return sum + Object.values(level.products).reduce((levelSum, product) => levelSum + product.maxCapacity, 0);
    }, 0);
    const fillRate = totalCapacity > 0 ? Math.round((totalProducts / totalCapacity) * 100) : 0;
    
    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('machines')}
            className="mr-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800">
              {selectedVendingMachine.name}
            </h2>
            <p className="text-sm text-gray-600">
              {selectedVendingMachine.address}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalLevels}</div>
            <div className="text-sm text-blue-800">Total Levels</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{fillRate}%</div>
            <div className="text-sm text-green-800">Fill Rate</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{totalProducts}</div>
            <div className="text-sm text-yellow-800">Total Products</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{totalCompartments}</div>
            <div className="text-sm text-purple-800">Total Compartments</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-6">
          {selectedVendingMachine.levels
            .sort((a, b) => b.id - a.id)
            .map((level) => (
              <CircularLevelIndicator
                key={level.id}
                level={level}
                size={100}
                showDetails={true}
                onClick={() => {
                  if (!isRemoteViewer) {
                    setSelectedLevel(level);
                    setCurrentView('compartments');
                  }
                }}
              />
            ))}
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Stock Status Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Empty (0-10%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Low (10-30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Medium (30-70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Full (70-100%)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CompartmentManagementView = () => {
    if (!selectedLevel) return null;
    
    const [editingProducts, setEditingProducts] = useState(selectedLevel.products);
    const [isDirty, setIsDirty] = useState(false);
    
    useEffect(() => {
      setEditingProducts(selectedLevel.products);
      setIsDirty(false);
    }, [selectedLevel]);
    
    const handleProductChange = (
      compartmentNum: number,
      field: 'productName' | 'quantity' | 'maxCapacity',
      value: string | number
    ) => {
      setEditingProducts(prev => ({
        ...prev,
        [compartmentNum]: {
          productName: prev[compartmentNum]?.productName ?? '',
          quantity: prev[compartmentNum]?.quantity ?? 0,
          maxCapacity: prev[compartmentNum]?.maxCapacity ?? 20,
          ...prev[compartmentNum],
          [field]: value
        }
      }));
      setIsDirty(true);
    };
    
    const handleSave = () => {
      const updatedLevel = {
        ...selectedLevel,
        products: editingProducts,
        stockStatus: calculateStockStatus(editingProducts)
      };
      setSelectedLevel(updatedLevel);
      setIsDirty(false);
      setCurrentView('levels');
    };
    
    const totalProducts = Object.values(editingProducts).reduce((sum, p) => sum + p.quantity, 0);
    const totalCapacity = Object.values(editingProducts).reduce((sum, p) => sum + p.maxCapacity, 0);
    const fillRate = totalCapacity > 0 ? Math.round((totalProducts / totalCapacity) * 100) : 0;
    const filledCompartments = Object.values(editingProducts).filter(p => p.quantity > 0).length;
    
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('levels')}
              className="mr-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Levels
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Manage Level {selectedLevel.id}
              </h2>
              <p className="text-sm text-gray-600">
                {selectedLevel.compartments} compartments
              </p>
            </div>
          </div>
          
          {!isRemoteViewer && isDirty && (
            <Button 
              onClick={handleSave}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col items-center">
            <CircularLevelIndicator 
              level={{...selectedLevel, products: editingProducts}} 
              size={250}
              showDetails={true}
            />
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg w-full max-w-sm">
              <h3 className="font-medium text-gray-700 mb-2">Level Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Compartments:</span>
                  <span className="font-medium">{selectedLevel.compartments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Filled:</span>
                  <span className="font-medium">{filledCompartments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Products:</span>
                  <span className="font-medium">{totalProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fill Rate:</span>
                  <span className="font-medium">{fillRate}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Compartment Configuration</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Array.from({ length: selectedLevel.compartments }, (_, index) => {
                const compartmentNum = index + 1;
                const product = editingProducts[compartmentNum] ?? {
                  productName: '',
                  quantity: 0,
                  maxCapacity: 20
                };
                
                return (
                  <div key={compartmentNum} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-700">Compartment {compartmentNum}</span>
                      <span className="text-sm text-gray-500">
                        {product.quantity} / {product.maxCapacity}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Name
                        </label>
                        <Input
                          type="text"
                          placeholder="Enter product name"
                          value={product.productName}
                          onChange={(e) => handleProductChange(compartmentNum, 'productName', e.target.value)}
                          disabled={isRemoteViewer}
                          className="text-sm"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Quantity
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={product.maxCapacity}
                            value={product.quantity}
                            onChange={(e) => handleProductChange(
                              compartmentNum, 
                              'quantity', 
                              parseInt(e.target.value) || 0
                            )}
                            disabled={isRemoteViewer}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Capacity
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={product.maxCapacity}
                            onChange={(e) => handleProductChange(
                              compartmentNum, 
                              'maxCapacity', 
                              parseInt(e.target.value) || 20
                            )}
                            disabled={isRemoteViewer}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      
                      {!isRemoteViewer && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProductChange(compartmentNum, 'quantity', 0)}
                            className="text-xs"
                          >
                            Empty
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProductChange(compartmentNum, 'quantity', product.maxCapacity)}
                            className="text-xs"
                          >
                            Fill
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleVendingMachineClick = useCallback((vending: VendingMachine) => {
    const enhancedMachine: EnhancedVendingMachine = {
      ...vending,
      levels: generateMockLevels(vending.id),
      inventory: vending.inventory || {}
    };
    setSelectedVendingMachine(enhancedMachine);
    setCurrentView('machines');
  }, [generateMockLevels]);

  const handleSheetClose = useCallback((open: boolean) => {
    if (!open) {
      setSelectedVendingMachine(null);
      setCurrentView('machines');
      setSelectedLevel(null);
      setIsRemoteViewer(false);
    }
  }, []);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          className={cn(className, "z-0 flex w-full flex-col max-lg:grow")}
          onContextMenu={
            handleRightClick as unknown as MouseEventHandler<HTMLDivElement>
          }
        >
          <MapContainer
            ref={mapRef}
            center={useThisCenter}
            zoom={MAP_DATA.zoom}
            doubleClickZoom={MAP_DATA.doubleClickZoom}
            maxBounds={MAP_DATA.maxBounds}
            minZoom={MAP_DATA.minZoom}
            style={MAP_DATA.style}
            className={"relative"}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mapRef.current && <MapViewButton mapRef={mapRef.current} />}

            {currentLocation && (
              <RouteMarker
                id={"0"}
                variant="currentPosition"
                position={[
                  currentLocation.latitude!,
                  currentLocation.longitude!,
                ]}
                color={3}
              >
                Current Location
                <Circle
                  center={
                    [
                      currentLocation.latitude!,
                      currentLocation.longitude!,
                    ] as LatLngExpression
                  }
                  radius={currentLocation?.accuracy ?? 0}
                  color="blue"
                />
              </RouteMarker>
            )}

            {getVendingMachines.data?.map((vending) => (
              <RouteMarker
                key={vending.id}
                id={vending.id}
                variant="depot"
                position={[
                  vending.coordinates.latitude,
                  vending.coordinates.longitude,
                ]}
                color={5}
                onClick={() => handleVendingMachineClick(vending)}
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{vending.name ?? "Unnamed Vending"}</span>
                  {vending.address && (
                    <span className="text-xs">{vending.address}</span>
                  )}
                </div>
              </RouteMarker>
            ))}

            {activeDrivers &&
              Object.keys(activeDrivers).map((vehicleId) => {
                const latLng = activeDrivers[vehicleId];
                const driver = findVehicleById(vehicleId);

                return (
                  <RouteMarker
                    id={"0"}
                    key={vehicleId}
                    variant="car"
                    position={[latLng!.lat, latLng!.lng]}
                    color={cuidToIndex(vehicleId)}
                  >
                    <MapPopup
                      name={driver?.driver.name ?? "Driver"}
                      address={driver?.driver?.address?.formatted ?? ""}
                      id={vehicleId}
                      kind="DRIVER"
                    />
                  </RouteMarker>
                );
              })}
            
            <LayersControl position="topright">
              <LayersControl.Overlay name="Drivers" checked>
                <LeafletLayerGroup>
                  {!!mapGraphics.driverMapPoints &&
                    mapGraphics.driverMapPoints?.length > 0 &&
                    mapGraphics.driverMapPoints.map((vehicle, idx) => {
                      const latLng: [number, number] = [
                        vehicle.lat,
                        vehicle.lng,
                      ];

                      const isActive = activeDrivers[vehicle.id];

                      return (
                        <RouteMarker
                          key={idx}
                          variant={isActive ? "depot" : "car"}
                          id={vehicle.id}
                          position={latLng}
                          color={Number(vehicle.color)}
                        >
                          <MapPopup
                            name={vehicle.name}
                            address={vehicle.address}
                            id={vehicle.id}
                            kind="DRIVER"
                          />
                        </RouteMarker>
                      );
                    })}
                </LeafletLayerGroup>
              </LayersControl.Overlay>
              <LayersControl.Overlay name="Assigned Stops" checked>
                <LeafletLayerGroup>
                  {mapGraphics.assignedMapPoints?.length > 0 &&
                    mapGraphics.assignedMapPoints.map((stop, idx) => (
                      <RouteMarker
                        key={idx}
                        variant="stop"
                        id={stop.id}
                        position={[stop.lat, stop.lng]}
                        color={
                          mapGraphics.getJobStatusColor({
                            color: Number(stop.color) ?? -1,
                            id: Number(stop.id),
                          }) ?? -1
                        }
                      >
                        <MapPopup
                          name={stop.name}
                          address={stop.address}
                          id={stop.id}
                          kind="CLIENT"
                        />
                      </RouteMarker>
                    ))}
                  {mapGraphics.routeGeoJsonList.length > 0 &&
                    mapGraphics.routeGeoJsonList.map((route) => (
                      <GeoJSON
                        key={route.id}
                        data={
                          formatGeometryString(
                            route.geoJson,
                            route.vehicleId,
                          ) as unknown as GeoJsonData
                        }
                        style={getStyle as PathOptions}
                      />
                    ))}
                </LeafletLayerGroup>
              </LayersControl.Overlay>
              <LayersControl.Overlay name="Unassigned Stops" checked>
                <LeafletLayerGroup>
                  {mapGraphics.unassignedMapPoints?.length > 0 &&
                    mapGraphics.unassignedMapPoints.map((stop, idx) => (
                      <RouteMarker
                        key={idx}
                        variant="stop"
                        color={mapGraphics.getJobStatusColor({
                          color: Number(stop.color) ?? -1,
                          id: Number(stop.id),
                        })}
                        id={stop.id}
                        position={[stop.lat, stop.lng]}
                        useThisIconInstead={mapGraphics.assignAnIcon2(
                          selectedJobIds.includes(stop.id),
                          false,
                          stop,
                        )}
                      >
                        <MapPopup
                          name={stop.name}
                          address={stop.address}
                          id={stop.id}
                          kind="CLIENT"
                        />
                      </RouteMarker>
                    ))}
                </LeafletLayerGroup>
              </LayersControl.Overlay>
            </LayersControl>
          </MapContainer>
        </ContextMenuTrigger>

        {latLng && (
          <ContextMenuContent className="z-50 flex justify-center">
            <ContextMenuItem
              onClick={() =>
                addJobByLatLng({
                  latitude: latLng.lat,
                  longitude: latLng.lng,
                })
              }
            >
              <div className="flex flex-col items-center justify-center">
                <div>Add Client here</div>
                <div className="text-sm text-gray-500">
                  ({latLng?.lat.toFixed(2) ?? 0}, {latLng?.lng.toFixed(2) ?? 0})
                </div>
              </div>
            </ContextMenuItem>

            <ContextMenuItem
              onClick={() =>
                addDriverByLatLng({
                  latitude: latLng.lat,
                  longitude: latLng.lng,
                })
              }
            >
              <div className="flex flex-col items-center justify-center">
                <div>Add Driver here</div>
                <div className="text-sm text-gray-500">
                  ({latLng?.lat.toFixed(2) ?? 0}, {latLng?.lng.toFixed(2) ?? 0})
                </div>
              </div>
            </ContextMenuItem>

            <ContextMenuItem
              onClick={() =>
                addVendingMachineByLatLng({
                  latitude: latLng.lat,
                  longitude: latLng.lng,
                })
              }
            >
              <div className="flex flex-col items-center justify-center">
                <div>Add Vending Machine here</div>
                <div className="text-sm text-gray-500">
                  ({latLng?.lat.toFixed(2) ?? 0}, {latLng?.lng.toFixed(2) ?? 0})
                </div>
              </div>
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>

      {selectedVendingMachine && (
        <Sheet
          open={!!selectedVendingMachine}
          onOpenChange={handleSheetClose}
        >
          <SheetContent side="right" className="bg-white w-[800px] max-w-[90vw] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {currentView === 'machines' && 'Vending Machine Management'}
                {currentView === 'levels' && 'Level Overview'}
                {currentView === 'compartments' && 'Compartment Management'}
                {isRemoteViewer && <Eye className="h-5 w-5 text-blue-500" />}
              </SheetTitle>
            </SheetHeader>

            <div className="py-4">
              {currentView === 'machines' && <MachineSelectionView />}
              {currentView === 'levels' && <LevelsOverviewView />}
              {currentView === 'compartments' && <CompartmentManagementView />}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
});

RoutingMap.displayName = "RoutingMap";
export default RoutingMap;