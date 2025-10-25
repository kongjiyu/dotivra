# ToolBar Drag Removal - Manual Guide

## Current Status
- ✅ Chat history service updated to use `chatbox_history` collection
- ✅ Firestore indexes updated with new field names (`refDoc`, removed `userId` from index)
- ⏳ ToolBar has 117 compilation errors due to removed state variables

## Step-by-Step Removal Instructions

### 1. Delete Lines 148-158 (Orientation Cookie Loading)
```typescript
// DELETE THIS ENTIRE useEffect:
useEffect(() => {
    const savedOrientation = document.cookie
        .split('; ')
        .find(row => row.startsWith('toolbarOrientation='))
        ?.split('=')[1];

    if (savedOrientation === 'vertical') {
        setIsVertical(true);
    }
}, []);
```

### 2. Delete Lines 160-170 (toggleOrientation Function)
```typescript
// DELETE THIS ENTIRE FUNCTION:
const toggleOrientation = () => {
    const newOrientation = !isVertical;
    setIsVertical(newOrientation);

    // Save to cookies (expires in 1 year)
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `toolbarOrientation=${newOrientation ? 'vertical' : 'horizontal'}; expires=${expires.toUTCString()}; path=/`;
};
```

### 3. Delete Lines 172-225 (All Drag Handlers)
```typescript
// DELETE ALL THREE FUNCTIONS:
const handleDragStart = useCallback((e: React.MouseEvent) => {
    // ... entire function
}, []);

const handleDragMove = useCallback((e: MouseEvent) => {
    // ... entire function
}, [isDragging, showNavigationPane, chatSidebarOpen]);

const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragStartPos.current = null;
}, []);
```

### 4. Delete Lines 227-238 (Drag Event Listeners useEffect)
```typescript
// DELETE THIS useEffect:
useEffect(() => {
    if (isDragging) {
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        return () => {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        };
    }
}, [isDragging, handleDragMove, handleDragEnd]);
```

### 5. Delete Lines 240-241 (isUpdatingPosition ref)
```typescript
// DELETE THIS LINE:
const isUpdatingPosition = useRef(false);
```

### 6. Delete Lines 243-315 (getSmartPositionForOrientation Function)
```typescript
// DELETE THIS ENTIRE FUNCTION (very long):
const getSmartPositionForOrientation = useCallback((currentPos: { x: number; y: number } | null): { x: number; y: number } | null => {
    // ... ~70 lines of code
}, []);
```

### 7. Delete Lines 317-365 (safeClampPosition Function)  
```typescript
// DELETE THIS ENTIRE FUNCTION:
const safeClampPosition = useCallback((position: { x: number; y: number } | null): { x: number; y: number } | null => {
    // ... ~45 lines of code
}, [showNavigationPane, chatSidebarOpen]);
```

### 8. Delete Lines 367-410 (Window Resize useEffect)
```typescript
// DELETE THIS ENTIRE useEffect:
useEffect(() => {
    if (isDragging) return;

    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
        // ... resize handler
    };

    const updateMaxWidth = () => {
        // ... max width calculation
    };

    updateMaxWidth();
    window.addEventListener('resize', updateMaxWidth);
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('resize', updateMaxWidth);
        clearTimeout(resizeTimeout);
    };
}, [toolbarPosition, safeClampPosition, isDragging, showNavigationPane, chatSidebarOpen]);
```

### 9. Delete Lines 412-426 (Orientation Change useEffect)
```typescript
// DELETE THIS useEffect:
useEffect(() => {
    if (isDragging || isUpdatingPosition.current || !toolbarPosition) return;

    isUpdatingPosition.current = true;
    getSmartPositionForOrientation(toolbarPosition);

    setTimeout(() => {
        isUpdatingPosition.current = false;
    }, 200);

}, [isVertical, getSmartPositionForOrientation, toolbarPosition, isDragging]);
```

### 10. Delete Lines 428-438 (Force Recalculation useEffect)
```typescript
// DELETE THIS useEffect:
useEffect(() => {
    if (isDragging) return;

    if (!toolbarPosition) {
        // Trigger re-render to recalculate inline style
        setCurrentFontSize(prev => prev);
    }
}, [showNavigationPane, chatSidebarOpen, toolbarPosition, isDragging]);
```

### 11. Delete Lines 440-488 (Position Recalculation useEffect)
```typescript
// DELETE THIS ENTIRE useEffect (very long):
useEffect(() => {
    if (isDragging || !containerRef.current) return;

    // Delete all ~40+ lines including requestAnimationFrame logic

}, [showNavigationPane, chatSidebarOpen, toolbarPosition, isDragging]);
```

### 12. Find and Remove Drag Handle JSX (Around Lines 1130-1165)
Search for this JSX and DELETE IT:
```jsx
{/* Drag Handle and Orientation Toggle */}
<div className={`flex ${isVertical ? 'flex-col gap-1 items-center' : 'items-center gap-1'} flex-shrink-0`}>
    {/* Drag Handle - Enlarged for better grab area with padding */}
    <div
        className={`flex items-center justify-center ${isVertical ? 'h-10 w-10 py-2' : 'h-10 w-10 px-2'} cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded transition-colors flex-shrink-0`}
        onMouseDown={handleDragStart}
        title="Drag to reposition toolbar"
    >
        {isVertical ? (
            <GripHorizontal className="w-5 h-5 text-gray-500" />
        ) : (
            <GripVertical className="w-5 h-5 text-gray-500" />
        )}
    </div>

    {/* Orientation Toggle Button - Separate row in vertical mode */}
    <Button
        variant="outline"
        size="sm"
        onClick={toggleOrientation}
        className={`h-8 ${isVertical ? 'w-8' : 'w-8'} p-0 bg-white hover:bg-gray-50 border-gray-300 flex items-center justify-center`}
        title={isVertical ? "Switch to Horizontal" : "Switch to Vertical"}
    >
        {isVertical ? <ArrowLeftRight className="w-4 h-4" /> : <ArrowUpDown className="w-4 h-4" />}
    </Button>
</div>

<div className={isVertical ? 'h-px w-full bg-gray-200 my-1' : 'w-px h-6 bg-gray-300 mx-0.5'}></div>
```

### 13. Simplify All Conditional Rendering
Find and replace ALL instances of:
- `${isVertical ? 'flex-col' : 'flex-row'}` → remove, use horizontal only
- `${isVertical ? 'h-px w-full' : 'w-px h-6'}` → use `w-px h-6` only
- `${isVertical ? ... : ...}` → choose horizontal option always

### 14. Simplify Toolbar Container Positioning
Find the main return statement's toolbar container (around line 1100-1120) and change from:
```jsx
<div
    ref={containerRef}
    className={...}
    style={toolbarPosition ? {
        position: 'fixed',
        left: `${toolbarPosition.x}px`,
        top: `${toolbarPosition.y}px`,
    } : {
        // Default position calculation
        ...
    }}
>
```

To:
```jsx
<div
    ref={containerRef}
    className="fixed top-[152px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg"
>
```

### 15. Update useMemo Calls (Around Lines 815-820)
Change from:
```typescript
const shouldShowInsertOptions = useMemo(() => isVertical ? false : availableWidth >= 1400, [isVertical, availableWidth]);
const shouldShowIndent = useMemo(() => isVertical ? false : availableWidth >= 1200, [isVertical, availableWidth]);
```

To:
```typescript
const shouldShowInsertOptions = useMemo(() => availableWidth >= 1400, [availableWidth]);
const shouldShowIndent = useMemo(() => availableWidth >= 1200, [availableWidth]);
```

And change:
```typescript
const availableWidth = toolbarMaxWidth || windowWidth;
```

To:
```typescript
const availableWidth = windowWidth;
```

## Alternative: Automated Removal Script

If manual deletion is too tedious, you can run this PowerShell script in the project root:

```powershell
# Backup first
Copy-Item "src\components\Document\ToolBar.tsx" "src\components\Document\ToolBar.tsx.backup"

# Use a text editor or VS Code's search/replace with regex
# This is complex due to the file size - manual is recommended
```

## After Deletion Checklist

1. [ ] No compilation errors remain
2. [ ] Toolbar appears at top-center of editor
3. [ ] Toolbar is always horizontal (no vertical mode)
4. [ ] No drag handles or grip icons visible
5. [ ] All formatting buttons work (bold, italic, etc.)
6. [ ] Font/size/color controls work
7. [ ] Table/list/heading controls work
8. [ ] No console errors

## Estimated Time
- Manual deletion: 20-30 minutes
- Testing: 10 minutes
- Total: 30-40 minutes

## Files Modified
1. ✅ `src/services/chatHistoryService.ts` - Collection name changed to `chatbox_history`
2. ✅ `firestore.indexes.json` - Index updated for new field names
3. ⏳ `src/components/Document/ToolBar.tsx` - Needs manual drag removal

