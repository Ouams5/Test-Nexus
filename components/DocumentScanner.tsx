import React, { useState, useRef } from 'react';
import { 
    Camera, Sparkles, UploadCloud, Trash2, Plus, Check, Loader2, 
    AlertCircle, Undo2, Smartphone, UserPlus, Info, CheckCircle2 
} from 'lucide-react';
import { scanDocumentWithGemini, ExtractedStudent } from '../services/ai';
import { UserRole } from '../types';

interface DocumentScannerProps {
    onImportSuccess: () => void;
    db: any;
    showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
    confirm: (opts: { title: string; message: string; confirmText?: string; cancelText?: string; type?: "info" | "warning" | "danger" }) => Promise<boolean>;
}

export const DocumentScanner: React.FC<DocumentScannerProps> = ({
    onImportSuccess,
    db,
    showToast,
    confirm
}) => {
    // Media & Files States
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string>("image/jpeg");
    const [base64Data, setBase64Data] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Scan & Process States
    const [isScanning, setIsScanning] = useState(false);
    const [scanStep, setScanStep] = useState<string>("");
    const [extractedUsers, setExtractedUsers] = useState<ExtractedStudent[]>([]);
    
    // Import States
    const [isImporting, setIsImporting] = useState(false);
    const [importSummary, setImportSummary] = useState<{ success: number; errors: any[] } | null>(null);

    // Handling Image Selections
    const handleFileSelected = (file: File) => {
        if (!file.type.startsWith("image/")) {
            showToast("Please upload an image file (PNG or JPEG).", "error");
            return;
        }

        setMimeType(file.type);
        const reader = new FileReader();
        reader.onloadend = () => {
            const resultStr = reader.result as string;
            setPreviewUrl(resultStr);
            setBase64Data(resultStr);
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
        }
    };

    // OCR scanning action
    const startOcrScan = async () => {
        if (!base64Data) return;

        setIsScanning(true);
        setImportSummary(null);
        try {
            setScanStep("Initializing connection with Gemini OCR...");
            await new Promise(r => setTimeout(r, 600));
            
            setScanStep("Uploading image matrix stream... (Converting to clean base64)");
            await new Promise(r => setTimeout(r, 650));
            
            setScanStep("Running Optical Character Recognition algorithm...");
            const results = await scanDocumentWithGemini(base64Data, mimeType);
            
            setScanStep("Structuring student records & generating institutional emails...");
            await new Promise(r => setTimeout(r, 700));

            setScanStep("Validating data schema...");
            await new Promise(r => setTimeout(r, 500));

            if (results && results.length > 0) {
                setExtractedUsers(results);
                showToast(`Gemini successfully extracted ${results.length} students!`, "success");
            } else {
                showToast("No students could be found/extracted from this document.", "warning");
            }
        } catch (err: any) {
            console.error(err);
            const errMsg = err.message || "An unexpected error occurred during OCR scanning.";
            showToast(errMsg, "error");
        } finally {
            setIsScanning(false);
            setScanStep("");
        }
    };

    // Table Row Edits
    const handleUpdateUser = (index: number, field: keyof ExtractedStudent, value: string) => {
        const copy = [...extractedUsers];
        copy[index] = {
            ...copy[index],
            [field]: value
        };
        setExtractedUsers(copy);
    };

    const handleDeleteRow = (index: number) => {
        setExtractedUsers(extractedUsers.filter((_, i) => i !== index));
    };

    const handleAddRow = () => {
        setExtractedUsers([
            ...extractedUsers,
            {
                name: "New Student",
                email: "new.student@bniyekhlef.edu",
                password: "Pass" + Math.floor(1000 + Math.random() * 9000) + "!",
                grade: "TC"
            }
        ]);
    };

    // Master execution of bulk imports
    const triggerBulkImport = async () => {
        if (extractedUsers.length === 0) return;

        // Validation checks
        const invalidUsers = extractedUsers.filter(u => !u.name.trim() || !u.email.trim() || !u.password?.trim());
        if (invalidUsers.length > 0) {
            showToast("Please ensure all students have a valid Name, Email, and Password.", "warning");
            return;
        }

        const confirmed = await confirm({
            title: "Launch Bulk Creation",
            message: `Are you sure you want to register these ${extractedUsers.length} student accounts into the club database? Dual emails, if exists, will be skipped automatically.`,
            confirmText: "Create Accounts",
            type: "info"
        });

        if (!confirmed) return;

        setIsImporting(true);
        try {
            // Map students to structure expected by actual db
            const payload = extractedUsers.map(u => ({
                name: u.name.trim(),
                email: u.email.trim().toLowerCase(),
                password: u.password?.trim() || "Pass123!",
                grade: u.grade || "TC"
            }));

            const result = await db.bulkCreateUsers(payload);
            setImportSummary(result);
            
            if (result.success > 0) {
                showToast(`Successfully registered ${result.success} accounts!`, "success");
                onImportSuccess();
            }
            if (result.errors && result.errors.length > 0) {
                showToast(`Failed to register ${result.errors.length} accounts. Duplicate emails might have been skipped.`, "warning");
            }
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Bulk Import failed.", "error");
        } finally {
            setIsImporting(false);
        }
    };

    const resetScanner = () => {
        setPreviewUrl(null);
        setBase64Data(null);
        setExtractedUsers([]);
        setImportSummary(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
    };

    return (
        <div className="space-y-6">
            {/* Guide banner for iOS Add to Home Screen stand-alone capability */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-start gap-3">
                <Smartphone className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-400">iOS Standalone Mode Configuration</h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                        To run this website completely <strong>full-screen</strong> like a native app on iOS (not opened inside an address-bar browser), tap the <span className="font-semibold bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">Share</span> button in Safari, then select <span className="font-semibold bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">Add to Home Screen</span>. Let UniClub Nexus launch as a seamless standalone app!
                    </p>
                </div>
            </div>

            {/* Stage 1: Document Upload / Live Snapshot */}
            {!previewUrl && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Native Camera Trigger */}
                    <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="p-8 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800/40 dark:to-slate-800/20 border-2 border-indigo-200 dark:border-slate-700 rounded-2xl hover:border-indigo-400 dark:hover:border-slate-500 cursor-pointer flex flex-col items-center justify-center gap-4 transition-all duration-200 group active:scale-[0.98]"
                    >
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Camera size={32} />
                        </div>
                        <div className="space-y-1 text-center">
                            <span className="font-bold text-slate-800 dark:text-slate-100 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                Scan with Camera
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] block">
                                Directly capture a class document using your mobile camera
                            </span>
                        </div>
                        <input 
                            type="file" 
                            ref={cameraInputRef}
                            onChange={handleFileChange}
                            accept="image/*" 
                            capture="environment" // Forces use of default environment-facing device camera on iOS/Android
                            className="hidden"
                        />
                    </button>

                    {/* Desktop / Local File Upload */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleFileSelected(e.dataTransfer.files[0]);
                            }
                        }}
                        className="p-8 bg-white dark:bg-slate-800/40 border-2 border-slate-200 dark:border-slate-700 border-dashed rounded-2xl hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex flex-col items-center justify-center gap-4 transition-all duration-200 group active:scale-[0.98]"
                    >
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <UploadCloud size={32} />
                        </div>
                        <div className="space-y-1 text-center">
                            <span className="font-bold text-slate-800 dark:text-slate-100 block group-hover:text-blue-500 transition-colors">
                                Upload Photo of Document
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Drag & Drop here or Browse files (.png, .jpeg, .jpg)
                            </span>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*" 
                            className="hidden"
                        />
                    </div>
                </div>
            )}

            {/* Stage 2: Preview Document & Trigger OCR */}
            {previewUrl && extractedUsers.length === 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-50 dark:bg-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Document Preview</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Ready to initiate AI Character Recognition</p>
                            </div>
                        </div>
                        <button 
                            onClick={resetScanner}
                            className="px-3.5 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-500 flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-rose-200"
                        >
                            <Undo2 size={14} /> Reset
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        {/* Img Preview */}
                        <div className="md:col-span-5 aspect-[4/3] md:aspect-auto md:max-h-[300px] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center p-2 relative shadow-inner">
                            <img src={previewUrl} className="max-w-full max-h-full object-contain rounded" alt="Document Preview" />
                            <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md text-white text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border border-slate-800">
                                {mimeType.split("/")[1]}
                            </div>
                        </div>

                        {/* OCR Trigger details */}
                        <div className="md:col-span-7 space-y-4">
                            <div className="space-y-2">
                                <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">OCR Engine: Gemini 3.5 Flash</span>
                                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Optical Document Data Extraction</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Gemini will analyze the photo of your class sheet, roster list, or written page schema. It recognizes names, maps them into standard school emails, generates temporary strong passwords, and automatically pairs or extracts their respective levels (e.g. <strong>TC</strong>, <strong>1 Bac</strong>, or <strong>2 Bac</strong>).
                                </p>
                            </div>

                            <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-start gap-2.5">
                                <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                    <strong>Formatting Tips:</strong> Handwritten lists are supported under clear horizontal text lines. High contrast scans offer near-perfect schema validation. Don't worry, you'll be able to review and modify any parsed accounts before finalizing!
                                </p>
                            </div>

                            {isScanning ? (
                                <div className="space-y-2 bg-indigo-50/50 dark:bg-slate-900/60 p-4 rounded-xl border border-indigo-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={20} />
                                        <span className="text-xs font-bold text-indigo-950 dark:text-slate-200 animate-pulse">Running OCR Scan...</span>
                                    </div>
                                    <p className="text-[11px] text-indigo-800 dark:text-indigo-400 font-mono transition-all duration-300 pl-8">
                                        {scanStep}
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={startOcrScan}
                                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-sm cursor-pointer"
                                >
                                    <Sparkles size={16} /> Scan & Extract with Gemini
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Stage 3: Display Extracted editable list */}
            {extractedUsers.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800 dark:text-white">Review Extracted Accounts</h3>
                                <span className="bg-blue-100 dark:bg-slate-700 text-blue-700 dark:text-slate-300 text-xs font-extrabold px-2 py-0.5 rounded-full">
                                    {extractedUsers.length} Found
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Modify rows directly below to rectify errors before bulk registration</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleAddRow}
                                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-blue-600 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-xl flex items-center gap-1.5 transition-all"
                            >
                                <Plus size={14} /> Add Row
                            </button>
                            <button
                                onClick={resetScanner}
                                className="px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 rounded-xl flex items-center gap-1 transition-all"
                            >
                                <Trash2 size={14} /> Clear Scan
                            </button>
                        </div>
                    </div>

                    {/* Import feedback summary */}
                    {importSummary && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle2 size={18} />
                                <span className="text-sm font-bold">Import Finished Successfully</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 max-w-md">
                                <div className="bg-white dark:bg-slate-850 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Created Accounts</span>
                                    <span className="text-xl font-bold text-slate-800 dark:text-white">{importSummary.success}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-850 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Errors / Skipped</span>
                                    <span className="text-xl font-bold text-slate-850 dark:text-slate-400">{importSummary.errors.length}</span>
                                </div>
                            </div>
                            {importSummary.errors.length > 0 && (
                                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-rose-500 uppercase">Errors Log:</span>
                                    {importSummary.errors.map((err, i) => (
                                        <p key={i} className="text-[11px] text-rose-600 font-mono">
                                            {err.email}: {err.error}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Editable Accounts Table / List */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-inner">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="p-3 w-8 text-center text-slate-400">#</th>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">School Email</th>
                                        <th className="p-3">Password</th>
                                        <th className="p-3 w-36">Grade</th>
                                        <th className="p-3 w-12 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {extractedUsers.map((u, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="p-3 text-center text-slate-400 font-mono text-xs">{i + 1}</td>
                                            
                                            {/* Name Edit */}
                                            <td className="p-2">
                                                <input 
                                                    type="text" 
                                                    value={u.name}
                                                    onChange={e => handleUpdateUser(i, 'name', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-medium text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    placeholder="Aymane Alami"
                                                />
                                            </td>

                                            {/* Email Edit */}
                                            <td className="p-2">
                                                <input 
                                                    type="email" 
                                                    value={u.email}
                                                    onChange={e => handleUpdateUser(i, 'email', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    placeholder="aymane.alami@bniyekhlef.edu"
                                                />
                                            </td>

                                            {/* Password Edit */}
                                            <td className="p-2">
                                                <input 
                                                    type="text" 
                                                    value={u.password || ''}
                                                    onChange={e => handleUpdateUser(i, 'password', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    placeholder="Pass"
                                                />
                                            </td>

                                            {/* Grade Edit Dropdown */}
                                            <td className="p-2">
                                                <select
                                                    value={u.grade}
                                                    onChange={e => handleUpdateUser(i, 'grade', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 font-semibold outline-none focus:border-blue-500"
                                                >
                                                    <option value="TC">TC (Tronc Commun)</option>
                                                    <option value="1 Bac">1 Bac (Première)</option>
                                                    <option value="2 Bac">2 Bac (Terminale)</option>
                                                    <option value="Administration">Administration / Executive</option>
                                                </select>
                                            </td>

                                            {/* Row Deletion action */}
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRow(i)}
                                                    className="p-1 px-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Remove student row"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Master Actions footer */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-xs text-slate-500 dark:text-slate-450 flex items-center gap-1.5">
                            <Info size={14} className="text-blue-500" />
                            Double-check names & grades before proceeding. Click Add Row if you need additional registries.
                        </span>
                        
                        <div className="flex gap-3 justify-end w-full sm:w-auto">
                            <button
                                onClick={resetScanner}
                                disabled={isImporting}
                                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 active:scale-95 transition-all text-xs font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={triggerBulkImport}
                                disabled={isImporting}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all text-xs font-extrabold cursor-pointer"
                            >
                                {isImporting ? <Loader2 className="animate-spin" size={15} /> : <UserPlus size={15} />}
                                {isImporting ? 'Importing Accounts...' : `Create ${extractedUsers.length} Accounts`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
