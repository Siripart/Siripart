/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent } from 'react';
import { summarizeMeetingInvite, MeetingSummary } from './services/ai';
import { Loader2, Calendar, MapPin, Users, FileText, Copy, Check, ClipboardList, Upload, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ file: File; preview: string; base64: string } | null>(null);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (images and pdf)
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf' && file.type !== 'text/plain') {
      setError('กรุณาอัปโหลดไฟล์รูปภาพ (PNG, JPG) หรือ PDF เท่านั้น');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setSelectedFile({
        file,
        preview: file.type.startsWith('image/') ? (event.target?.result as string) : '',
        base64
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBack = () => {
    setSummary(null);
    setError(null);
  };

  const handleSummarize = async () => {
    if (!inputText.trim() && !selectedFile) return;
    
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const fileData = selectedFile ? {
        data: selectedFile.base64,
        mimeType: selectedFile.file.type
      } : undefined;

      const result = await summarizeMeetingInvite(inputText, fileData);
      setSummary(result);
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการสรุปข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    
    const textToCopy = `
หัวข้อ: ${summary.topic}
วันเวลา: ${summary.dateTime}
สถานที่: ${summary.location}
ผู้เข้าร่วม: ${summary.attendees.join(', ')}
วาระการประชุม:
${summary.agenda.map(item => `- ${item}`).join('\n')}
หมายเหตุ: ${summary.notes}
    `.trim();

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-lg mb-4">
            <ClipboardList className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            สรุปเชิญประชุม
          </h1>
          <p className="text-slate-500 text-lg">
            อัปโหลดรูปภาพ หรือวางข้อความนัดหมาย เพื่อให้ AI ช่วยสรุปข้อมูล
          </p>
        </header>

        {/* Input Section */}
        <AnimatePresence mode="wait">
          {!summary ? (
            <motion.div 
              key="input-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
          <div className="p-1 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center px-4 py-2 text-sm font-medium text-slate-500">
              <FileText className="w-4 h-4 mr-2" />
              ข้อมูลต้นฉบับ
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* File Upload Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                selectedFile ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,application/pdf,text/plain"
              />
              
              {selectedFile ? (
                <div className="w-full flex items-center justify-between p-2">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    {selectedFile.preview ? (
                      <img src={selectedFile.preview} alt="Preview" className="w-12 h-12 object-cover rounded-lg shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="text-left truncate">
                      <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{selectedFile.file.name}</p>
                      <p className="text-xs text-slate-500">{(selectedFile.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="p-2 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">คลิกเพื่ออัปโหลดไฟล์</p>
                  <p className="text-xs text-slate-400 mt-1">รองรับรูปภาพ (PNG, JPG) หรือ PDF</p>
                </>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-xs text-slate-400 uppercase">หรือ พิมพ์ข้อความ</span>
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="พิมพ์รายละเอียดเพิ่มเติม หรือวางข้อความที่นี่..."
              className="w-full h-24 p-4 text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
            />
            
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSummarize}
                disabled={loading || (!inputText.trim() && !selectedFile)}
                className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    กำลังวิเคราะห์...
                  </>
                ) : (
                  <>
                    สรุปข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
        ) : (
            /* Result Section */
            <motion.div
              key="result-section"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden"
            >
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-4">
                    <button
                      onClick={handleBack}
                      className="mt-1 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="กลับไปแก้ไข"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{summary.topic}</h2>
                      <p className="text-slate-500 text-sm mt-1">สรุปข้อมูลสำคัญสำหรับการนัดหมาย</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="คัดลอกข้อมูล"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">วันและเวลา</h3>
                      <p className="text-slate-700 mt-1">{summary.dateTime}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">สถานที่</h3>
                      <p className="text-slate-700 mt-1">{summary.location}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">ผู้เข้าร่วม</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {summary.attendees.length > 0 ? (
                          summary.attendees.map((person, i) => (
                            <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                              {person}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">วาระการประชุม</h3>
                <ul className="space-y-2">
                  {summary.agenda.length > 0 ? (
                    summary.agenda.map((item, i) => (
                      <li key={i} className="flex items-start text-slate-700">
                        <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500 text-sm italic">ไม่มีรายละเอียดวาระการประชุม</li>
                  )}
                </ul>
              </div>

              {summary.notes && summary.notes !== '-' && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-1">หมายเหตุ</h3>
                  <p className="text-amber-900 text-sm">{summary.notes}</p>
                </div>
              )}
            </div>
            
            <div className="p-6 pt-0 flex justify-center">
              <button
                onClick={handleBack}
                className="inline-flex items-center px-6 py-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                ย้อนกลับไปสรุปใหม่
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
        {/* Footer Info */}
        <footer className="pt-8 pb-4 text-center border-t border-slate-200">
          <p className="text-slate-400 text-xs font-medium">
            แผนกปฏิบัติงานดิจิทัล ผปด.กดส.ฝสบ.กฟต.1 (511583 นายสิริภาส มีสุข โทร.41-15690)
          </p>
        </footer>
      </div>
      <SpeedInsights />
    </div>
  );
}

