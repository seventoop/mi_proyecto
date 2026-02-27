const lucide = require('lucide-react');
const icons = [
    'Upload', 'Trash2', 'Save', 'MapPin', 'ImageIcon',
    'Plus', 'X', 'Loader2', 'GripVertical', 'Pencil', 'Check',
    'Link2', 'Navigation', 'Eye', 'Share2', 'Play', 'Pause',
    'Maximize2', 'RotateCcw', 'Camera', 'Grid3x3', 'Sparkles',
    'Edit', 'CheckCircle', 'XCircle', 'AlertCircle', 'Clock',
    'ChevronLeft', 'ChevronRight', 'Volume2', 'VolumeX',
    'SkipForward', 'Info', 'ExternalLink', 'Copy'
];

icons.forEach(name => {
    if (!lucide[name]) {
        console.error(`MISSING ICON: ${name}`);
    } else {
        console.log(`OK: ${name}`);
    }
});
