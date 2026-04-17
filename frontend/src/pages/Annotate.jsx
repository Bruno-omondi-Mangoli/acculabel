import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../services/api";

// Comprehensive labels
const PREDEFINED_LABELS = [
  "car", "person", "dog", "cat", "truck", "bus", "bicycle", "motorcycle",
  "bird", "horse", "sheep", "cow", "elephant", "bear", "backpack", "umbrella",
  "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
  "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "bottle",
  "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
  "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
  "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop"
];

const getLabelColor = (label) => {
  const colors = [
    "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD",
    "#F39C12", "#E74C3C", "#3498DB", "#2ECC71", "#1ABC9C", "#9B59B6",
    "#E67E22", "#95A5A6", "#16A085", "#27AE60", "#2980B9", "#8E44AD"
  ];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash) + label.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
};

const AnnotationModes = {
  RECTANGLE: "rectangle",
  POLYGON: "polygon",
  POLYLINE: "polyline",
  CUBOID: "cuboid",
  SENTIMENT: "sentiment",
  COMPARE: "compare",
  SELECT: "select"
};

const Annotate = () => {
  const [searchParams] = useSearchParams();
  const imageId = searchParams.get("id");
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Image and annotations state
  const [image, setImage] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // Annotation mode and labels
  const [mode, setMode] = useState(AnnotationModes.RECTANGLE);
  const [selectedLabel, setSelectedLabel] = useState("car");
  const [customLabel, setCustomLabel] = useState("");
  
  // Hidden annotations
  const [hiddenLabels, setHiddenLabels] = useState(new Set());
  
  // Sentiment
  const [sentiment, setSentiment] = useState("neutral");
  
  // Image comparison
  const [compareImageRight, setCompareImageRight] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentShape, setCurrentShape] = useState(null);
  const [points, setPoints] = useState([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [isDraggingAnnotation, setIsDraggingAnnotation] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  
  // View controls
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Refs
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (imageId) loadImageAndAnnotations();
  }, [imageId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadImageAndAnnotations = async () => {
    try {
      const imageRes = await API.get(`/images/${imageId}`);
      setImage(imageRes.data);
      const annRes = await API.get(`/annotations/image/${imageId}`);
      setAnnotations(annRes.data);
      showMessage("Image loaded successfully!");
    } catch (error) {
      console.error("Failed to load", error);
      showMessage("Failed to load image", true);
    }
  };

  const showMessage = (msg, isError = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await API.post("/images/upload", formData);
      setUploadedFile(response.data);
      setImage(response.data);
      window.history.pushState({}, "", `?id=${response.data.id}`);
      showMessage("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload failed", error);
      showMessage("Upload failed", true);
    }
  };

  const getCurrentLabel = () => customLabel.trim() || selectedLabel;

  // Export function for multiple formats
  const exportFormat = async (format) => {
    const imageIdNum = parseInt(imageId) || uploadedFile?.id;
    if (!imageIdNum) {
      showMessage("No image to export", true);
      return;
    }
    
    setShowExportDropdown(false);
    
    try {
      const response = await API.get(`/export/${format}/${imageIdNum}`, {
        responseType: 'blob'
      });
      
      const extension = format === 'coco' ? 'json' : format === 'yolo' ? 'txt' : 'csv';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `annotations.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showMessage(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export failed", error);
      showMessage("Export failed", true);
    }
  };

  // AI Suggest Labels
  const getAISuggestions = async () => {
    const imageIdNum = parseInt(imageId) || uploadedFile?.id;
    if (!imageIdNum) {
      showMessage("No image loaded", true);
      return;
    }
    
    try {
      const response = await API.get(`/ai-annotation/suggest-labels/${imageIdNum}`);
      const suggestions = response.data.suggested_labels;
      showMessage(`AI Suggestions: ${suggestions.slice(0, 8).join(", ")}`);
    } catch (error) {
      console.error("AI suggestions failed", error);
      showMessage("AI suggestions unavailable", true);
    }
  };

  const toggleLabelVisibility = (label) => {
    const newHidden = new Set(hiddenLabels);
    if (newHidden.has(label)) {
      newHidden.delete(label);
    } else {
      newHidden.add(label);
    }
    setHiddenLabels(newHidden);
    setTimeout(() => drawAllAnnotations(), 50);
  };

  const hideAllOtherLabels = (keepLabel) => {
    const allLabels = [...new Set(annotations.map(a => a.label))];
    const newHidden = new Set();
    allLabels.forEach(label => {
      if (label !== keepLabel) {
        newHidden.add(label);
      }
    });
    setHiddenLabels(newHidden);
    setTimeout(() => drawAllAnnotations(), 50);
    showMessage(`Showing only "${keepLabel}" labels`);
  };

  const showAllLabels = () => {
    setHiddenLabels(new Set());
    setTimeout(() => drawAllAnnotations(), 50);
    showMessage("All labels visible");
  };

  const submitForReview = async () => {
    if (annotations.length === 0) {
      showMessage("No annotations to submit. Please add some annotations first.", true);
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await API.post(`/annotations/submit-review/${imageId || uploadedFile?.id}`);
      showMessage(response.data.message);
    } catch (error) {
      console.error("Failed to submit", error);
      showMessage(error.response?.data?.detail || "Failed to submit for review", true);
    } finally {
      setSubmitting(false);
    }
  };

  const drawAllAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = imageRef.current;
    
    if (!img || !img.complete || !img.naturalWidth) return;
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    annotations.forEach((ann) => {
      if (hiddenLabels.has(ann.label)) return;
      
      const isSelected = selectedAnnotation?.id === ann.id;
      const color = getLabelColor(ann.label);
      ctx.lineWidth = isSelected ? 4 : 3;
      
      // RECTANGLE
      if (ann.type === "rectangle") {
        ctx.strokeStyle = color;
        ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
        ctx.fillStyle = color + "33";
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
        if (showLabels) {
          ctx.fillStyle = color;
          ctx.font = "bold 16px Arial";
          ctx.fillText(ann.label, ann.x, ann.y - 5);
          ctx.font = "12px Arial";
          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = 2;
          ctx.shadowColor = "black";
          ctx.fillText(`${Math.round(ann.width)}x${Math.round(ann.height)}`, ann.x + 5, ann.y + 20);
          ctx.shadowBlur = 0;
        }
      }
      
      // CUBOID (3D Box)
      if (ann.type === "cuboid") {
        ctx.strokeStyle = color;
        const depth = ann.depth || ann.width * 0.4;
        
        // Front face
        ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
        ctx.fillStyle = color + "33";
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
        
        // Back face
        ctx.strokeRect(ann.x + depth, ann.y - depth, ann.width, ann.height);
        ctx.fillStyle = color + "22";
        ctx.fillRect(ann.x + depth, ann.y - depth, ann.width, ann.height);
        
        // Connecting lines
        ctx.beginPath();
        ctx.moveTo(ann.x, ann.y);
        ctx.lineTo(ann.x + depth, ann.y - depth);
        ctx.moveTo(ann.x + ann.width, ann.y);
        ctx.lineTo(ann.x + ann.width + depth, ann.y - depth);
        ctx.moveTo(ann.x, ann.y + ann.height);
        ctx.lineTo(ann.x + depth, ann.y + ann.height - depth);
        ctx.moveTo(ann.x + ann.width, ann.y + ann.height);
        ctx.lineTo(ann.x + ann.width + depth, ann.y + ann.height - depth);
        ctx.stroke();
        
        if (showLabels) {
          ctx.fillStyle = color;
          ctx.font = "bold 16px Arial";
          ctx.fillText(ann.label, ann.x, ann.y - 5);
        }
      }
      
      // POLYGON
      if (ann.type === "polygon" && ann.points && ann.points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.fillStyle = color + "33";
        ctx.fill();
        if (showLabels) {
          ctx.fillStyle = color;
          ctx.font = "bold 16px Arial";
          ctx.fillText(ann.label, ann.points[0].x, ann.points[0].y - 5);
        }
      }
      
      // POLYLINE
      if (ann.type === "polyline" && ann.points && ann.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.strokeStyle = color;
        ctx.stroke();
        if (showLabels) {
          ctx.fillStyle = color;
          ctx.font = "bold 16px Arial";
          ctx.fillText(ann.label, ann.points[0].x, ann.points[0].y - 5);
        }
      }
      
      // SENTIMENT
      if (ann.type === "sentiment") {
        const sentimentColor = ann.sentiment === "positive" ? "#00ff00" : 
                               ann.sentiment === "negative" ? "#ff0000" : "#ffff00";
        ctx.fillStyle = sentimentColor;
        ctx.beginPath();
        ctx.arc(ann.x, ann.y, 15, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.font = "bold 14px Arial";
        ctx.fillText(ann.label, ann.x + 10, ann.y - 10);
      }
      
      // Draw resize handles when selected (12 points)
      if (isSelected && mode === AnnotationModes.SELECT && (ann.type === "rectangle" || ann.type === "cuboid")) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        
        // 12 resize handles
        const handles = [
          { x: ann.x, y: ann.y }, // top-left
          { x: ann.x + ann.width/2, y: ann.y }, // top-middle
          { x: ann.x + ann.width, y: ann.y }, // top-right
          { x: ann.x, y: ann.y + ann.height/2 }, // middle-left
          { x: ann.x + ann.width, y: ann.y + ann.height/2 }, // middle-right
          { x: ann.x, y: ann.y + ann.height }, // bottom-left
          { x: ann.x + ann.width/2, y: ann.y + ann.height }, // bottom-middle
          { x: ann.x + ann.width, y: ann.y + ann.height }, // bottom-right
          { x: ann.x + ann.width/3, y: ann.y }, // top-left-mid
          { x: ann.x + ann.width*2/3, y: ann.y }, // top-right-mid
          { x: ann.x, y: ann.y + ann.height/3 }, // left-top-mid
          { x: ann.x + ann.width, y: ann.y + ann.height/3 }, // right-top-mid
          { x: ann.x, y: ann.y + ann.height*2/3 }, // left-bottom-mid
          { x: ann.x + ann.width, y: ann.y + ann.height*2/3 }, // right-bottom-mid
          { x: ann.x + ann.width/3, y: ann.y + ann.height }, // bottom-left-mid
          { x: ann.x + ann.width*2/3, y: ann.y + ann.height } // bottom-right-mid
        ];
        
        handles.forEach(handle => {
          ctx.fillRect(handle.x - 5, handle.y - 5, 10, 10);
          ctx.strokeRect(handle.x - 5, handle.y - 5, 10, 10);
        });
      }
    });
    
    // Draw current shape
    if (currentShape && currentShape.width) {
      const color = getLabelColor(getCurrentLabel());
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      
      if (mode === AnnotationModes.CUBOID) {
        // Preview cuboid with 3D effect
        const depth = currentShape.width * 0.4;
        ctx.strokeRect(currentShape.x, currentShape.y, currentShape.width, currentShape.height);
        ctx.strokeRect(currentShape.x + depth, currentShape.y - depth, currentShape.width, currentShape.height);
        ctx.beginPath();
        ctx.moveTo(currentShape.x, currentShape.y);
        ctx.lineTo(currentShape.x + depth, currentShape.y - depth);
        ctx.moveTo(currentShape.x + currentShape.width, currentShape.y);
        ctx.lineTo(currentShape.x + currentShape.width + depth, currentShape.y - depth);
        ctx.moveTo(currentShape.x, currentShape.y + currentShape.height);
        ctx.lineTo(currentShape.x + depth, currentShape.y + currentShape.height - depth);
        ctx.moveTo(currentShape.x + currentShape.width, currentShape.y + currentShape.height);
        ctx.lineTo(currentShape.x + currentShape.width + depth, currentShape.y + currentShape.height - depth);
        ctx.stroke();
      } else {
        ctx.strokeRect(currentShape.x, currentShape.y, currentShape.width, currentShape.height);
      }
      
      ctx.fillStyle = color + "33";
      ctx.fillRect(currentShape.x, currentShape.y, currentShape.width, currentShape.height);
      ctx.setLineDash([]);
      
      if (showLabels) {
        ctx.fillStyle = color;
        ctx.font = "bold 14px Arial";
        ctx.fillText(getCurrentLabel(), currentShape.x, currentShape.y - 5);
      }
    }
    
    // Draw polygon points
    if (points.length > 0 && (mode === AnnotationModes.POLYGON || mode === AnnotationModes.POLYLINE)) {
      ctx.fillStyle = "#ffff00";
      points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.font = "bold 14px Arial";
        ctx.fillText(i + 1, p.x - 4, p.y - 4);
        ctx.fillStyle = "#ffff00";
      });
    }
  }, [annotations, currentShape, points, selectedAnnotation, hiddenLabels, showLabels, mode]);

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      drawAllAnnotations();
    }
  }, [drawAllAnnotations, image, uploadedFile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        showMessage("Undo (implement with history stack)");
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        showMessage("Redo (implement with history stack)");
      }
      if (e.key === 'Delete' && selectedAnnotation) {
        e.preventDefault();
        deleteAnnotation(selectedAnnotation.id);
      }
      if (e.key === 'Escape') {
        setSelectedAnnotation(null);
        setMode(AnnotationModes.RECTANGLE);
        showMessage("Selection cleared");
      }
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (PREDEFINED_LABELS[index]) {
          setSelectedLabel(PREDEFINED_LABELS[index]);
          setCustomLabel("");
          showMessage(`Selected label: ${PREDEFINED_LABELS[index]}`);
        }
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      }
      if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      if (e.key === ' ' && mode !== AnnotationModes.SELECT) {
        e.preventDefault();
        setMode(AnnotationModes.SELECT);
        showMessage("Edit mode activated");
      }
      if (e.key === 'r' || e.key === 'R') {
        setMode(AnnotationModes.RECTANGLE);
        setPoints([]);
        showMessage("Rectangle mode");
      }
      if (e.key === 'p' || e.key === 'P') {
        setMode(AnnotationModes.POLYGON);
        setPoints([]);
        showMessage("Polygon mode");
      }
      if (e.key === 'l' || e.key === 'L') {
        setMode(AnnotationModes.POLYLINE);
        setPoints([]);
        showMessage("Polyline mode");
      }
      if (e.key === 'c' || e.key === 'C') {
        setMode(AnnotationModes.CUBOID);
        setPoints([]);
        showMessage("Cuboid mode");
      }
      if (e.key === 's' || e.key === 'S') {
        setMode(AnnotationModes.SENTIMENT);
        setPoints([]);
        showMessage("Sentiment mode");
      }
      if (e.key === 'h' || e.key === 'H') {
        setShowLabels(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotation, mode]);

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const getResizeHandle = (ann, x, y) => {
    const handles = [
      { name: "top-left", x: ann.x, y: ann.y },
      { name: "top-mid", x: ann.x + ann.width/2, y: ann.y },
      { name: "top-right", x: ann.x + ann.width, y: ann.y },
      { name: "mid-left", x: ann.x, y: ann.y + ann.height/2 },
      { name: "mid-right", x: ann.x + ann.width, y: ann.y + ann.height/2 },
      { name: "bottom-left", x: ann.x, y: ann.y + ann.height },
      { name: "bottom-mid", x: ann.x + ann.width/2, y: ann.y + ann.height },
      { name: "bottom-right", x: ann.x + ann.width, y: ann.y + ann.height },
      { name: "top-left-mid", x: ann.x + ann.width/3, y: ann.y },
      { name: "top-right-mid", x: ann.x + ann.width*2/3, y: ann.y },
      { name: "left-top-mid", x: ann.x, y: ann.y + ann.height/3 },
      { name: "right-top-mid", x: ann.x + ann.width, y: ann.y + ann.height/3 },
      { name: "left-bottom-mid", x: ann.x, y: ann.y + ann.height*2/3 },
      { name: "right-bottom-mid", x: ann.x + ann.width, y: ann.y + ann.height*2/3 },
      { name: "bottom-left-mid", x: ann.x + ann.width/3, y: ann.y + ann.height },
      { name: "bottom-right-mid", x: ann.x + ann.width*2/3, y: ann.y + ann.height }
    ];
    for (const handle of handles) {
      if (Math.abs(x - handle.x) < 10 && Math.abs(y - handle.y) < 10) {
        return handle.name;
      }
    }
    return null;
  };

  const getAnnotationAtPoint = (x, y) => {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i];
      if (ann.type === "rectangle" || ann.type === "cuboid") {
        if (x >= ann.x && x <= ann.x + ann.width && y >= ann.y && y <= ann.y + ann.height) {
          return ann;
        }
      }
    }
    return null;
  };

  const handleMouseDown = (e) => {
    const { x, y } = getCanvasCoordinates(e);
    
    if (mode === AnnotationModes.SELECT) {
      const ann = getAnnotationAtPoint(x, y);
      if (ann) {
        const handle = getResizeHandle(ann, x, y);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setSelectedAnnotation(ann);
          setStartPos({ x, y });
        } else {
          setIsDraggingAnnotation(true);
          setSelectedAnnotation(ann);
          setDragOffset({ x: x - ann.x, y: y - ann.y });
        }
        drawAllAnnotations();
        return;
      } else {
        setSelectedAnnotation(null);
        drawAllAnnotations();
      }
    }
    
    if (mode === AnnotationModes.RECTANGLE || mode === AnnotationModes.CUBOID) {
      setIsDrawing(true);
      setStartPos({ x, y });
    } else if (mode === AnnotationModes.POLYGON || mode === AnnotationModes.POLYLINE) {
      setPoints([...points, { x, y }]);
      drawAllAnnotations();
    } else if (mode === AnnotationModes.SENTIMENT) {
      saveSentimentAnnotation(x, y);
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = getCanvasCoordinates(e);
    
    if (isResizing && selectedAnnotation) {
      let newX = selectedAnnotation.x;
      let newY = selectedAnnotation.y;
      let newWidth = selectedAnnotation.width;
      let newHeight = selectedAnnotation.height;
      
      switch (resizeHandle) {
        case "top-left":
          newWidth = selectedAnnotation.x + selectedAnnotation.width - x;
          newHeight = selectedAnnotation.y + selectedAnnotation.height - y;
          newX = x;
          newY = y;
          break;
        case "top-mid":
          newHeight = selectedAnnotation.y + selectedAnnotation.height - y;
          newY = y;
          break;
        case "top-right":
          newWidth = x - selectedAnnotation.x;
          newHeight = selectedAnnotation.y + selectedAnnotation.height - y;
          newY = y;
          break;
        case "mid-left":
          newWidth = selectedAnnotation.x + selectedAnnotation.width - x;
          newX = x;
          break;
        case "mid-right":
          newWidth = x - selectedAnnotation.x;
          break;
        case "bottom-left":
          newWidth = selectedAnnotation.x + selectedAnnotation.width - x;
          newHeight = y - selectedAnnotation.y;
          newX = x;
          break;
        case "bottom-mid":
          newHeight = y - selectedAnnotation.y;
          break;
        case "bottom-right":
          newWidth = x - selectedAnnotation.x;
          newHeight = y - selectedAnnotation.y;
          break;
        case "top-left-mid":
          newWidth = selectedAnnotation.x + selectedAnnotation.width - x;
          newHeight = selectedAnnotation.y + selectedAnnotation.height - y;
          newX = x;
          newY = y;
          break;
        case "top-right-mid":
          newWidth = x - selectedAnnotation.x;
          newHeight = selectedAnnotation.y + selectedAnnotation.height - y;
          newY = y;
          break;
        case "left-top-mid":
          newWidth = selectedAnnotation.x + selectedAnnotation.width - x;
          newHeight = selectedAnnotation.y + selectedAnnotation.height - y;
          newX = x;
          newY = y;
          break;
        case "right-top-mid":
          newWidth = x - selectedAnnotation.x;
          newHeight = selectedAnnotation.y + selectedAnnotation.height - y;
          newY = y;
          break;
        case "left-bottom-mid":
          newWidth = selectedAnnotation.x + selectedAnnotation.width - x;
          newHeight = y - selectedAnnotation.y;
          newX = x;
          break;
        case "right-bottom-mid":
          newWidth = x - selectedAnnotation.x;
          newHeight = y - selectedAnnotation.y;
          break;
        case "bottom-left-mid":
          newWidth = selectedAnnotation.x + selectedAnnotation.width - x;
          newHeight = y - selectedAnnotation.y;
          newX = x;
          break;
        case "bottom-right-mid":
          newWidth = x - selectedAnnotation.x;
          newHeight = y - selectedAnnotation.y;
          break;
      }
      
      if (newWidth > 5 && newHeight > 5) {
        updateAnnotation(selectedAnnotation.id, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight
        });
      }
      return;
    }
    
    if (isDraggingAnnotation && selectedAnnotation) {
      updateAnnotation(selectedAnnotation.id, {
        x: x - dragOffset.x,
        y: y - dragOffset.y
      });
      return;
    }
    
    if (!isDrawing) return;
    setCurrentShape({
      x: startPos.x,
      y: startPos.y,
      width: x - startPos.x,
      height: y - startPos.y,
    });
    drawAllAnnotations();
  };

  const handleMouseUp = async () => {
    if (isResizing || isDraggingAnnotation) {
      setIsResizing(false);
      setIsDraggingAnnotation(false);
      setResizeHandle(null);
      showMessage("Annotation updated!");
      return;
    }
    
    if (!isDrawing || !currentShape) {
      setIsDrawing(false);
      setCurrentShape(null);
      return;
    }
    
    const label = getCurrentLabel();
    if (!label) {
      showMessage("Please select a label", true);
      setIsDrawing(false);
      setCurrentShape(null);
      return;
    }
    
    const annotationData = {
      image_id: parseInt(imageId) || uploadedFile?.id,
      type: mode === AnnotationModes.CUBOID ? "cuboid" : "rectangle",
      label: label,
      x: Math.min(currentShape.x, currentShape.x + currentShape.width),
      y: Math.min(currentShape.y, currentShape.y + currentShape.height),
      width: Math.abs(currentShape.width),
      height: Math.abs(currentShape.height),
      depth: mode === AnnotationModes.CUBOID ? Math.abs(currentShape.width) * 0.4 : null,
    };
    
    try {
      const response = await API.post("/annotations/", annotationData);
      setAnnotations([...annotations, response.data]);
      showMessage(`${label} annotated!`);
    } catch (error) {
      console.error("Failed to save", error);
      showMessage("Failed to save annotation", true);
    }
    
    setCurrentShape(null);
    setIsDrawing(false);
  };

  const saveSentimentAnnotation = async (x, y) => {
    const label = getCurrentLabel();
    const annotationData = {
      image_id: parseInt(imageId) || uploadedFile?.id,
      type: "sentiment",
      label: label,
      x: x,
      y: y,
      sentiment: sentiment,
    };
    
    try {
      const response = await API.post("/annotations/", annotationData);
      setAnnotations([...annotations, response.data]);
      showMessage(`Sentiment: ${sentiment} for ${label}`);
    } catch (error) {
      console.error("Failed to save sentiment", error);
      showMessage("Failed to save sentiment", true);
    }
  };

  const completePolygon = async () => {
    if (mode === AnnotationModes.POLYGON && points.length < 3) {
      showMessage("Polygon needs at least 3 points", true);
      return;
    }
    if (mode === AnnotationModes.POLYLINE && points.length < 2) {
      showMessage("Polyline needs at least 2 points", true);
      return;
    }
    
    const label = getCurrentLabel();
    const annotationData = {
      image_id: parseInt(imageId) || uploadedFile?.id,
      type: mode === AnnotationModes.POLYLINE ? "polyline" : "polygon",
      label: label,
      points: points,
    };
    
    try {
      const response = await API.post("/annotations/", annotationData);
      setAnnotations([...annotations, response.data]);
      setPoints([]);
      showMessage(`${label} ${mode} completed!`);
    } catch (error) {
      console.error("Failed to save", error);
      showMessage("Failed to save annotation", true);
    }
  };

  const saveComparison = async () => {
    if (!compareImageRight) {
      showMessage("Please upload a second image for comparison", true);
      return;
    }
    
    if (!comparisonResult) {
      showMessage("Please select which image is better", true);
      return;
    }
    
    const label = getCurrentLabel();
    const annotationData = {
      image_id: parseInt(imageId) || uploadedFile?.id,
      type: "comparison",
      label: label || "comparison",
      comparison_winner: comparisonResult,
      comparison_image_url: compareImageRight,
    };
    
    try {
      const response = await API.post("/annotations/", annotationData);
      setAnnotations([...annotations, response.data]);
      showMessage(`Comparison saved: ${comparisonResult} is better`);
      setCompareMode(false);
      setCompareImageRight(null);
      setComparisonResult(null);
    } catch (error) {
      console.error("Failed to save comparison", error);
      showMessage("Failed to save comparison", true);
    }
  };

  const updateAnnotation = async (id, updates) => {
    try {
      const response = await API.put(`/annotations/${id}`, updates);
      setAnnotations(annotations.map(a => a.id === id ? response.data : a));
      if (selectedAnnotation?.id === id) {
        setSelectedAnnotation(response.data);
      }
      drawAllAnnotations();
    } catch (error) {
      console.error("Failed to update", error);
    }
  };

  const deleteAnnotation = async (id) => {
    try {
      await API.delete(`/annotations/${id}`);
      setAnnotations(annotations.filter(a => a.id !== id));
      if (selectedAnnotation?.id === id) {
        setSelectedAnnotation(null);
      }
      showMessage("Annotation deleted");
    } catch (error) {
      console.error("Failed to delete", error);
      showMessage("Failed to delete", true);
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.2, 5));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.05, 0.05));
  const handleResetZoom = () => setZoom(1);

  const labelGroups = {};
  annotations.forEach(ann => {
    if (!labelGroups[ann.label]) {
      labelGroups[ann.label] = { count: 0, color: getLabelColor(ann.label) };
    }
    labelGroups[ann.label].count++;
  });

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.logo}>Acculabel</h1>
        <div style={styles.navButtons}>
          <span style={styles.userEmail}>{user?.email}</span>
          <button onClick={() => navigate("/dashboard")} style={styles.dashboardBtn}>Dashboard</button>
        </div>
      </nav>
      
      <div style={styles.content}>
        {message && <div style={message.includes("✅") ? styles.successMsg : styles.message}>{message}</div>}
        
        {!image && !uploadedFile && (
          <div style={styles.uploadArea}>
            <h2> Upload an Image to Start Annotating</h2>
            <p>Supports JPG, PNG - Max 10MB</p>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={styles.fileInput} />
          </div>
        )}
        
        {(image || uploadedFile) && (
          <>
            <div style={styles.toolbar}>
              <div style={styles.modeSection}>
                <h4>Annotation Mode</h4>
                <div style={styles.modeButtons}>
                  <button onClick={() => { setMode(AnnotationModes.RECTANGLE); setPoints([]); }} style={mode === AnnotationModes.RECTANGLE ? styles.activeMode : styles.modeBtn}>📦 Rectangle</button>
                  <button onClick={() => { setMode(AnnotationModes.POLYGON); setPoints([]); }} style={mode === AnnotationModes.POLYGON ? styles.activeMode : styles.modeBtn}>🔺 Polygon</button>
                  <button onClick={() => { setMode(AnnotationModes.POLYLINE); setPoints([]); }} style={mode === AnnotationModes.POLYLINE ? styles.activeMode : styles.modeBtn}>📏 Polyline</button>
                  <button onClick={() => { setMode(AnnotationModes.CUBOID); setPoints([]); }} style={mode === AnnotationModes.CUBOID ? styles.activeMode : styles.modeBtn}>🧊 Cuboid (3D)</button>
                  <button onClick={() => { setMode(AnnotationModes.SENTIMENT); setPoints([]); }} style={mode === AnnotationModes.SENTIMENT ? styles.activeMode : styles.modeBtn}>😊 Sentiment</button>
                  <button onClick={() => { setMode(AnnotationModes.SELECT); setPoints([]); }} style={mode === AnnotationModes.SELECT ? styles.activeMode : styles.modeBtn}>✨ Select/Edit</button>
                  <button onClick={() => setCompareMode(!compareMode)} style={compareMode ? styles.activeMode : styles.modeBtn}>🔄 Compare Images</button>
                </div>
              </div>
              
              <div style={styles.labelSection}>
                <h4> Select Label</h4>
                <div style={styles.labelButtons}>
                  {PREDEFINED_LABELS.slice(0, 30).map(label => (
                    <button key={label} onClick={() => { setSelectedLabel(label); setCustomLabel(""); }} style={{...styles.label, backgroundColor: selectedLabel === label && !customLabel ? getLabelColor(label) : "#0f3460"}}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={styles.labelActions}>
                  <input type="text" placeholder="Or type custom label..." value={customLabel} onChange={(e) => { setCustomLabel(e.target.value); setSelectedLabel(""); }} style={styles.customInput} />
                  <button onClick={getAISuggestions} style={styles.aiBtn}> AI Suggest</button>
                </div>
              </div>
              
              {Object.keys(labelGroups).length > 0 && (
                <div style={styles.visibilitySection}>
                  <h4> Label Visibility</h4>
                  <div style={styles.visibilityButtons}>
                    <button onClick={showAllLabels} style={styles.visibilityBtn}>Show All</button>
                    {Object.entries(labelGroups).slice(0, 15).map(([label, info]) => (
                      <button key={label} onClick={() => toggleLabelVisibility(label)} style={{...styles.labelVisibilityBtn, backgroundColor: info.color, opacity: hiddenLabels.has(label) ? 0.4 : 1}}>
                        {label} ({info.count})
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {mode === AnnotationModes.SENTIMENT && (
                <div style={styles.sentimentSection}>
                  <h4> Sentiment</h4>
                  <div style={styles.sentimentButtons}>
                    <button onClick={() => setSentiment("positive")} style={sentiment === "positive" ? styles.activeSentiment : styles.sentimentBtn}>😊 Positive</button>
                    <button onClick={() => setSentiment("neutral")} style={sentiment === "neutral" ? styles.activeSentiment : styles.sentimentBtn}>😐 Neutral</button>
                    <button onClick={() => setSentiment("negative")} style={sentiment === "negative" ? styles.activeSentiment : styles.sentimentBtn}>😞 Negative</button>
                  </div>
                </div>
              )}
              
              {(mode === AnnotationModes.POLYGON || mode === AnnotationModes.POLYLINE) && points.length > 0 && (
                <button onClick={completePolygon} style={styles.completeBtn}>
                  ✓ Complete {mode} ({points.length} points)
                </button>
              )}
              
              <div style={styles.controlsSection}>
                <div style={styles.zoomControls}>
                  <button onClick={handleZoomIn} style={styles.controlBtn}>🔍 Zoom In</button>
                  <button onClick={handleZoomOut} style={styles.controlBtn}>🔍 Zoom Out</button>
                  <button onClick={handleResetZoom} style={styles.controlBtn}>⟳ Reset</button>
                  <span style={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
                </div>
                
                <div style={styles.viewControls}>
                  <button onClick={() => setShowLabels(!showLabels)} style={styles.controlBtn}>{showLabels ? "Hide Labels" : "Show Labels"}</button>
                  
                  <div style={styles.exportDropdown} ref={dropdownRef}>
                    <button onClick={() => setShowExportDropdown(!showExportDropdown)} style={styles.exportBtn}>
                       Export ▼
                    </button>
                    {showExportDropdown && (
                      <div style={styles.dropdownContent}>
                        <button onClick={() => exportFormat("coco")}>COCO JSON</button>
                        <button onClick={() => exportFormat("yolo")}>YOLO Format</button>
                        <button onClick={() => exportFormat("csv")}>CSV</button>
                      </div>
                    )}
                  </div>
                  
                  <button onClick={submitForReview} disabled={submitting} style={styles.submitBtn}>{submitting ? "Submitting..." : "✅ Submit for Review"}</button>
                </div>
              </div>
              
              <div style={styles.instructions}>
                💡 <strong>Instructions:</strong> 
                {mode === AnnotationModes.SELECT ? " Click on annotation to edit. Drag box to move, drag 16 handles to resize." :
                 mode === AnnotationModes.POLYGON ? " Click on image to add points, then click 'Complete Polygon'" :
                 mode === AnnotationModes.POLYLINE ? " Click on image to add points, then click 'Complete Polyline'" :
                 mode === AnnotationModes.SENTIMENT ? " Click anywhere on the image to add sentiment" :
                 mode === AnnotationModes.CUBOID ? " Click and drag to draw 3D bounding box" :
                 mode === AnnotationModes.COMPARE ? " Upload second image, then select which is better" :
                 " Click and drag on the image to draw"}
                <br />
                <strong> Keyboard Shortcuts:</strong> 
                R=Rect | P=Polygon | L=Polyline | C=Cuboid | S=Sentiment | 
                Delete=Remove | Esc=Clear | +/-=Zoom | Space=Edit | H=Hide Labels
              </div>
            </div>
            
            <div style={styles.canvasContainer} ref={containerRef}>
              <div style={{ transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`, transformOrigin: "0 0", display: "inline-block" }}>
                <img ref={imageRef} src={`${import.meta.env.VITE_API_URL}${image?.url || uploadedFile?.url}`} alt="Annotate" style={{ display: "block", maxWidth: "none" }} crossOrigin="anonymous" onLoad={drawAllAnnotations} />
                <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} style={styles.canvas} />
              </div>
            </div>
            
            {compareMode && (
              <div style={styles.comparePanel}>
                <h3> Compare Two Images</h3>
                <p>Upload a second image to compare with the current image:</p>
                
                <div style={styles.compareImagesContainer}>
                  <div style={styles.compareImageBox}>
                    <h4>Image A (Current)</h4>
                    <img src={`${import.meta.env.VITE_API_URL}${image?.url || uploadedFile?.url}`} alt="Current" style={styles.compareThumbnail} />
                    <p>Current Image</p>
                  </div>
                  
                  <div style={styles.compareImageBox}>
                    <h4>Image B (Compare)</h4>
                    <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files[0]; if (file) { setCompareImageRight(URL.createObjectURL(file)); } }} style={styles.compareInput} />
                    {compareImageRight && (
                      <>
                        <img src={compareImageRight} alt="Compare" style={styles.compareThumbnail} />
                        <button onClick={() => setCompareImageRight(null)} style={styles.removeCompareBtn}>Remove</button>
                      </>
                    )}
                  </div>
                </div>
                
                {compareImageRight && (
                  <>
                    <div style={styles.comparisonVote}>
                      <h4>Which image is better?</h4>
                      <div style={styles.compareButtons}>
                        <button onClick={() => setComparisonResult("left")} style={{...styles.compareBtn, ...(comparisonResult === "left" ? styles.activeCompareBtn : {})}}>🏆 Left is Better</button>
                        <button onClick={() => setComparisonResult("right")} style={{...styles.compareBtn, ...(comparisonResult === "right" ? styles.activeCompareBtn : {})}}>🏆 Right is Better</button>
                        <button onClick={() => setComparisonResult("equal")} style={{...styles.compareBtn, ...(comparisonResult === "equal" ? styles.activeCompareBtn : {})}}>⚖️ Equal</button>
                      </div>
                    </div>
                    
                    <div style={styles.compareActions}>
                      <button onClick={saveComparison} style={styles.saveCompareBtn}>💾 Save Comparison</button>
                      <button onClick={() => { setCompareMode(false); setCompareImageRight(null); setComparisonResult(null); }} style={styles.cancelCompareBtn}>Cancel</button>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div style={styles.annotationsPanel}>
              <h3> Annotations ({annotations.length})</h3>
              {annotations.length === 0 ? (
                <p style={styles.noAnnotations}>No annotations yet. Draw on the image above.</p>
              ) : (
                <div style={styles.annotationsList}>
                  {annotations.map((ann, idx) => (
                    <div key={ann.id} style={{...styles.annotationItem, borderLeftColor: getLabelColor(ann.label)}} onClick={() => { setSelectedAnnotation(ann); setMode(AnnotationModes.SELECT); }}>
                      <span style={styles.annotationNumber}>{idx + 1}.</span>
                      <span style={styles.annotationType}>[{ann.type}]</span>
                      <strong style={{...styles.annotationLabel, color: getLabelColor(ann.label)}}>{ann.label}</strong>
                      {ann.sentiment && <span style={styles.annotationSentiment}> - {ann.sentiment}</span>}
                      {ann.comparison_winner && <span> - Winner: {ann.comparison_winner}</span>}
                      <div style={styles.annotationActions}>
                        <button onClick={(e) => { e.stopPropagation(); hideAllOtherLabels(ann.label); }} style={styles.hideBtn}>👁️ Hide Others</button>
                        <button onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }} style={styles.deleteBtn}>🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", background: "#1a1a2e" },
  navbar: { background: "#16213e", color: "white", padding: "15px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" },
  logo: { margin: 0, fontSize: "20px" },
  navButtons: { display: "flex", gap: "15px", alignItems: "center" },
  userEmail: { marginRight: "15px" },
  dashboardBtn: { padding: "8px 16px", background: "#e94560", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  content: { padding: "20px" },
  message: { padding: "10px", background: "#0f3460", color: "white", borderRadius: "5px", marginBottom: "20px", textAlign: "center" },
  successMsg: { padding: "10px", background: "#28a745", color: "white", borderRadius: "5px", marginBottom: "20px", textAlign: "center" },
  uploadArea: { textAlign: "center", padding: "60px", background: "#16213e", borderRadius: "10px", color: "white" },
  fileInput: { marginTop: "20px", padding: "10px", fontSize: "16px" },
  toolbar: { background: "#16213e", padding: "20px", borderRadius: "10px", marginBottom: "20px", maxHeight: "500px", overflowY: "auto" },
  modeSection: { marginBottom: "20px" },
  modeButtons: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" },
  modeBtn: { padding: "8px 16px", background: "#0f3460", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  activeMode: { padding: "8px 16px", background: "#e94560", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  labelSection: { marginBottom: "20px" },
  labelButtons: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px", maxHeight: "120px", overflowY: "auto" },
  label: { padding: "5px 12px", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" },
  labelActions: { display: "flex", gap: "10px", alignItems: "center", marginTop: "10px" },
  customInput: { padding: "8px", background: "#0f3460", color: "white", border: "1px solid #e94560", borderRadius: "5px", width: "200px" },
  aiBtn: { padding: "8px 16px", background: "#9b59b6", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  visibilitySection: { marginBottom: "20px", borderTop: "1px solid #0f3460", paddingTop: "15px" },
  visibilityButtons: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px", maxHeight: "100px", overflowY: "auto" },
  labelVisibilityBtn: { padding: "5px 12px", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "11px" },
  visibilityBtn: { padding: "5px 12px", background: "#28a745", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" },
  sentimentSection: { marginBottom: "20px" },
  sentimentButtons: { display: "flex", gap: "10px", marginTop: "10px" },
  sentimentBtn: { padding: "8px 16px", background: "#0f3460", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  activeSentiment: { padding: "8px 16px", background: "#e94560", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  completeBtn: { marginBottom: "15px", padding: "10px 20px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px", width: "100%" },
  controlsSection: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" },
  zoomControls: { display: "flex", gap: "5px", alignItems: "center" },
  viewControls: { display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center" },
  controlBtn: { padding: "5px 10px", background: "#0f3460", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" },
  zoomLevel: { color: "white", marginLeft: "10px" },
  exportDropdown: { position: "relative", display: "inline-block" },
  dropdownContent: {
    position: "absolute",
    top: "100%",
    right: 0,
    backgroundColor: "#0f3460",
    minWidth: "120px",
    borderRadius: "5px",
    overflow: "hidden",
    zIndex: 10,
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
  },
  exportBtn: { padding: "5px 10px", background: "#28a745", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" },
  submitBtn: { padding: "5px 10px", background: "#17a2b8", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" },
  instructions: { padding: "10px", background: "#0f3460", borderRadius: "5px", fontSize: "14px", color: "#aaa", lineHeight: "1.5" },
  canvasContainer: { textAlign: "center", background: "#0f3460", padding: "20px", borderRadius: "10px", overflow: "auto", minHeight: "500px", position: "relative" },
  canvas: { position: "absolute", top: 0, left: 0, cursor: "crosshair" },
  comparePanel: { marginTop: "20px", background: "#16213e", padding: "20px", borderRadius: "10px", color: "white" },
  compareImagesContainer: { display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap", marginBottom: "20px" },
  compareImageBox: { textAlign: "center", background: "#0f3460", padding: "15px", borderRadius: "8px", minWidth: "200px" },
  compareThumbnail: { maxWidth: "200px", maxHeight: "150px", objectFit: "contain", marginTop: "10px", borderRadius: "5px" },
  compareInput: { marginTop: "10px", padding: "8px", fontSize: "12px" },
  removeCompareBtn: { marginTop: "10px", padding: "5px 10px", background: "#e94560", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" },
  comparisonVote: { textAlign: "center", marginBottom: "20px" },
  compareButtons: { display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px", flexWrap: "wrap" },
  compareBtn: { padding: "10px 20px", background: "#0f3460", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  activeCompareBtn: { background: "#e94560", boxShadow: "0 0 10px #e94560" },
  compareActions: { display: "flex", gap: "10px", justifyContent: "center" },
  saveCompareBtn: { padding: "10px 20px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  cancelCompareBtn: { padding: "10px 20px", background: "#e94560", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  annotationsPanel: { marginTop: "20px", background: "#16213e", padding: "15px", borderRadius: "10px", color: "white" },
  noAnnotations: { textAlign: "center", color: "#888", padding: "20px" },
  annotationsList: { maxHeight: "250px", overflowY: "auto" },
  annotationItem: { padding: "10px", borderBottom: "1px solid #0f3460", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", cursor: "pointer", borderLeftWidth: "3px", borderLeftStyle: "solid" },
  annotationNumber: { color: "#e94560", fontWeight: "bold" },
  annotationType: { color: "#ffd700", fontSize: "12px" },
  annotationLabel: { fontWeight: "bold" },
  annotationSentiment: { fontSize: "12px" },
  annotationActions: { marginLeft: "auto", display: "flex", gap: "5px" },
  hideBtn: { background: "#ffc107", color: "#333", border: "none", borderRadius: "3px", cursor: "pointer", padding: "3px 8px", fontSize: "11px" },
  deleteBtn: { background: "#e94560", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", padding: "3px 8px" },
};

export default Annotate;