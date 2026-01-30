import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Crown, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Loader2, 
  Star, 
  Hash, 
  Upload, 
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Search,
  Clock,
  Shield,
  Eye,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

type ViewMode = 'menu' | 'form' | 'patterns' | 'success' | 'track';

// Generate example ID from pattern
const generateExampleFromPattern = (pattern: string): string => {
  const letterToDigit: Record<string, string> = {};
  let nextDigit = 1;

  return pattern
    .split("")
    .map((char) => {
      if (char === "X") return "?";
      if (!letterToDigit[char]) {
        letterToDigit[char] = String(nextDigit);
        nextDigit = nextDigit >= 9 ? 1 : nextDigit + 1;
      }
      return letterToDigit[char];
    })
    .join("");
};

// Validate if an ID matches the pattern rules
const validateIdAgainstPattern = (id: string, pattern: string): boolean => {
  if (id.length !== pattern.length) return false;
  if (!/^\d+$/.test(id)) return false;

  const letterToDigit: Record<string, string> = {};
  const digitToLetter: Record<string, string> = {};

  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i];
    const d = id[i];

    if (p === "X") continue;

    if (letterToDigit[p]) {
      if (letterToDigit[p] !== d) return false;
    } else {
      if (digitToLetter[d] && digitToLetter[d] !== p) return false;
      letterToDigit[p] = d;
      digitToLetter[d] = p;
    }
  }

  return true;
};

// Level tabs configuration
const levelTabs = [30, 40, 50, 60, 70, 80, 90, 100];

// Pattern data organized by level
const patternsByLevel: Record<number, Record<number, string[]>> = {
  30: {
    7: ["ABCAAAA", "AABBCCD", "AAAABCD"],
  },
  40: {
    6: ["AABCCC", "ABACCC", "AAABBC"],
    7: ["AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"],
  },
  50: {
    5: ["ABCDD", "ABCBA", "AABBC"],
    6: ["ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"],
    7: ["ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"],
  },
  60: {
    5: ["AABAA", "ABABA", "ABCDD", "ABCBA", "AABBC"],
    6: ["ABCDEF", "AAAAAB", "ABBBBA", "AAABBB", "ABBABB", "ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"],
    7: ["ABBBBBB", "AAAAAAA", "ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"],
  },
  70: {
    5: ["ABCDE", "ABBBA", "AAAAB", "AABAA", "ABABA", "ABCDD", "ABCBA", "AABBC"],
    6: ["AAAAAA", "ABBBBB", "ABCDEF", "AAAAAB", "ABBBBA", "AAABBB", "ABBABB", "ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"],
    7: ["ABBBBBB", "AAAAAAA", "ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"],
  },
  80: {
    5: ["AAAAA", "XXABA", "XABAX", "ABBBB", "ABCDE", "ABBBA", "AAAAB", "AABAA", "ABABA", "ABCDD", "ABCBA", "AABBC"],
    6: ["XXAABB", "XABABX", "AAAAAA", "ABBBBB", "ABCDEF", "AAAAAB", "ABBBBA", "AAABBB", "ABBABB", "ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"],
    7: ["ABBBBBB", "AAAAAAA", "ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"],
  },
  90: {
    4: ["ABCD", "AABC", "ABBC", "XXAB", "XABX"],
    5: ["XXXAA", "AAXXX", "AAAAA", "XXABA", "XABAX", "ABBBB", "ABCDE", "ABBBA", "AAAAB", "AABAA", "ABABA", "ABCDD", "ABCBA", "AABBC"],
    6: ["XXAABB", "XABABX", "AAAAAA", "ABBBBB", "ABCDEF", "AAAAAB", "ABBBBA", "AAABBB", "ABBABB", "ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"],
    7: ["ABBBBBB", "AAAAAAA", "ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"],
  },
  100: {
    3: ["ABB", "ABA"],
    4: ["XXXX", "ABBB", "AAAA", "XAAA", "XXAA", "XXXA", "AAAB", "ABCD", "AABC", "ABBC", "XXAB", "XABX"],
    5: ["XXXXX", "XAAAA", "XXAXX", "XXXXA", "XXXAA", "AAXXX", "AAAAA", "XXABA", "XABAX", "ABBBB", "ABCDE", "ABBBA", "AAAAB", "AABAA", "ABABA", "ABCDD", "ABCBA", "AABBC"],
    6: ["XXXXXX", "XAAAAA", "XAAAAX", "XXXAAA", "XXXXXA", "XXAABB", "XABABX", "AAAAAA", "ABBBBB", "ABCDEF", "AAAAAB", "ABBBBA", "AAABBB", "ABBABB", "ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"],
    7: ["XXXXAAA", "XAAAAAA", "ABBBBBB", "AAAAAAA", "ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"],
  },
};

interface SpecialIdRequest {
  id: string;
  gala_user_id: string;
  gala_username: string | null;
  user_level: number;
  digit_length: number;
  pattern_code: string;
  preferred_exact_id: string | null;
  status: string;
  ai_verified_level: number | null;
  rejection_reason: string | null;
  created_at: string;
}

export default function SpecialIdPage() {
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<ViewMode>('menu');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState("");
  
  // Form data
  const [galaUserId, setGalaUserId] = useState("");
  const [galaUsername, setGalaUsername] = useState("");
  const [userLevel, setUserLevel] = useState("");
  const [verifiedLevel, setVerifiedLevel] = useState<number | null>(null);
  const [allLevels, setAllLevels] = useState<number[]>([]);
  const [profileScreenshot, setProfileScreenshot] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isImageVerified, setIsImageVerified] = useState(false);
  
  // Pattern selection
  const [selectedLevel, setSelectedLevel] = useState(60);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [selectedDigitLength, setSelectedDigitLength] = useState<number | null>(null);
  const [preferredExactId, setPreferredExactId] = useState("");
  
  // Track state
  const [trackQuery, setTrackQuery] = useState("");
  const [trackResults, setTrackResults] = useState<SpecialIdRequest[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [showExampleDialog, setShowExampleDialog] = useState(false);

  // Get patterns for selected level
  const currentPatterns = useMemo(() => {
    return patternsByLevel[selectedLevel] || {};
  }, [selectedLevel]);

  // Get available digit lengths for selected level
  const availableDigitLengths = useMemo(() => {
    return Object.keys(currentPatterns).map(Number).sort((a, b) => a - b);
  }, [currentPatterns]);

  // Get eligible levels based on user input
  const eligibleLevels = useMemo(() => {
    const level = parseInt(userLevel) || 0;
    return levelTabs.filter(l => level >= l);
  }, [userLevel]);

  // Group patterns into rows of 4
  const getPatternRows = (patterns: string[]) => {
    const rows: string[][] = [];
    for (let i = 0; i < patterns.length; i += 4) {
      rows.push(patterns.slice(i, i + 4));
    }
    return rows;
  };

  const handleProfileScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error("حجم الصورة يجب أن يكون أقل من 100MB");
        return;
      }
      setProfileScreenshot(file);
      setPreviewImage(URL.createObjectURL(file));
      setIsImageVerified(false);
      setVerifiedLevel(null);
      setAllLevels([]);
      setUserLevel("");
      
      // Auto-verify the image immediately
      await verifyProfileImage(file);
    }
  };
  
  const verifyProfileImage = async (file: File) => {
    setIsVerifying(true);
    const loadingToast = toast.loading("جاري التحقق من الصورة...");

    try {
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-special-id-level`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            imageBase64: base64Image,
            claimedLevel: 0,
            claimedUserId: galaUserId.trim(),
          }),
        }
      );

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (!result.is_valid) {
        toast.error(result.error || "الصورة غير صالحة");
        setProfileScreenshot(null);
        setPreviewImage(null);
        setIsVerifying(false);
        return;
      }

      // Successfully verified - set the levels
      const maxLvl = result.max_level || 0;
      const levels = result.all_levels || [];
      
      setVerifiedLevel(maxLvl);
      setAllLevels(levels);
      setUserLevel(String(maxLvl));
      setIsImageVerified(true);
      
      // Auto-fill Gala ID if extracted
      if (result.user_id && !galaUserId) {
        setGalaUserId(result.user_id);
      }
      
      // Auto-fill username if extracted
      if (result.username && !galaUsername) {
        setGalaUsername(result.username);
      }

      toast.success(`✅ تم التحقق! المستوى الأعلى: ${maxLvl} (اللفلات: ${levels.join(', ')})`);
      
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error verifying image:", error);
      toast.error("حدث خطأ أثناء التحقق من الصورة");
      setProfileScreenshot(null);
      setPreviewImage(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePatternSelect = (pattern: string, digitLength: number) => {
    setSelectedPattern(pattern);
    setSelectedDigitLength(digitLength);
  };

  const canProceedToPatterns = () => {
    const level = parseInt(userLevel) || 0;
    return level >= 30 && galaUserId.trim().length > 0 && profileScreenshot !== null && isImageVerified;
  };

  const handleProceedToPatterns = async () => {
    if (!canProceedToPatterns()) {
      if (!isImageVerified) {
        toast.error("يرجى رفع صورة من صفحة Me في غلا لايف والانتظار حتى يتم التحقق");
        return;
      }
      if (!galaUserId.trim()) {
        toast.error("يرجى إدخال ايدي حسابك");
        return;
      }
      if (!userLevel || parseInt(userLevel) < 30) {
        toast.error("يجب أن يكون مستواك 30 أو أعلى");
        return;
      }
      return;
    }

    // Check if user is currently banned
    const { data: bannedRequests } = await supabase
      .from('special_id_requests')
      .select('ban_expires_at')
      .eq('gala_user_id', galaUserId.trim())
      .eq('status', 'banned')
      .gt('ban_expires_at', new Date().toISOString())
      .limit(1);

    if (bannedRequests && bannedRequests.length > 0) {
      const banExpiry = new Date(bannedRequests[0].ban_expires_at);
      const hoursLeft = Math.ceil((banExpiry.getTime() - Date.now()) / (1000 * 60 * 60));
      toast.error(`⛔ أنت محظور حالياً! يرجى الانتظار ${hoursLeft} ساعة`);
      return;
    }

    // Already verified - proceed to patterns
    const level = parseInt(userLevel);
    const highestEligible = levelTabs.filter(l => level >= l).pop() || 30;
    setSelectedLevel(highestEligible);
    setViewMode("patterns");
  };

  const handleSubmit = async () => {
    if (!selectedPattern || !selectedDigitLength) {
      toast.error("يرجى اختيار نمط أولاً");
      return;
    }

    const trimmedPreferred = preferredExactId.trim();
    if (trimmedPreferred.length > 0) {
      if (trimmedPreferred.length !== selectedDigitLength) {
        toast.error(`يجب أن يكون الايدي ${selectedDigitLength} أرقام فقط`);
        return;
      }

      if (!validateIdAgainstPattern(trimmedPreferred, selectedPattern)) {
        toast.error(`الايدي لا يطابق النمط ${selectedPattern}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Upload profile screenshot
      const screenshotExt = profileScreenshot!.name.split('.').pop();
      const screenshotPath = `special-id/${Date.now()}-${galaUserId}.${screenshotExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(screenshotPath, profileScreenshot!);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(screenshotPath);

      // Create request
      const { data, error } = await supabase
        .from("special_id_requests")
        .insert({
          gala_user_id: galaUserId.trim(),
          gala_username: galaUsername.trim() || null,
          user_level: parseInt(userLevel),
          digit_length: selectedDigitLength,
          pattern_code: selectedPattern,
          preferred_exact_id: trimmedPreferred || null,
          profile_screenshot_url: urlData.publicUrl,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;

      // Send Telegram notification
      try {
        await supabase.functions.invoke("send-special-id-notification", {
          body: {
            requestId: data.id,
            galaUserId: galaUserId.trim(),
            galaUsername: galaUsername.trim(),
            userLevel: parseInt(userLevel),
            patternCode: selectedPattern,
            digitLength: selectedDigitLength,
            preferredId: trimmedPreferred,
            screenshotUrl: urlData.publicUrl,
          },
        });
      } catch (notifError) {
        console.error("Notification error:", notifError);
      }

      setSubmittedRequestId(data.id);
      setViewMode("success");
      
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrack = async () => {
    if (!trackQuery.trim()) {
      toast.error("يرجى إدخال ايدي غلا لايف");
      return;
    }

    setIsTracking(true);
    try {
      const { data, error } = await supabase
        .from("special_id_requests")
        .select("*")
        .eq("gala_user_id", trackQuery.trim())
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTrackResults(data || []);
      if (!data || data.length === 0) {
        toast.info("لا توجد طلبات لهذا الايدي");
      }
    } catch (error) {
      console.error("Track error:", error);
      toast.error("حدث خطأ أثناء البحث");
    } finally {
      setIsTracking(false);
    }
  };

  const resetForm = () => {
    setGalaUserId("");
    setGalaUsername("");
    setUserLevel("");
    setVerifiedLevel(null);
    setAllLevels([]);
    setProfileScreenshot(null);
    setPreviewImage(null);
    setIsImageVerified(false);
    setSelectedPattern(null);
    setSelectedDigitLength(null);
    setPreferredExactId("");
    setSubmittedRequestId("");
    setViewMode("menu");
  };

  // Level tab scroll
  const [tabScrollIndex, setTabScrollIndex] = useState(0);
  const visibleTabs = 3;
  const canScrollLeft = tabScrollIndex > 0;
  const canScrollRight = tabScrollIndex < levelTabs.length - visibleTabs;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">قيد المراجعة</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">تمت الموافقة</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">مرفوض</span>;
      case 'banned':
        return <span className="px-2 py-1 bg-red-600/30 text-red-500 rounded-full text-xs">محظور</span>;
      default:
        return null;
    }
  };

  // Success View
  if (viewMode === "success") {
    return (
      <div className="min-h-screen bg-background p-4" dir="rtl">
        <div className="max-w-md mx-auto pt-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-primary-foreground" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground">تم إرسال الطلب بنجاح!</h1>
            <p className="text-muted-foreground">سيتم مراجعة طلبك وإعلامك بالنتيجة</p>
            
            <div className="dark-card p-4 space-y-2">
              <p className="text-sm text-muted-foreground">رقم الطلب:</p>
              <p className="font-mono text-lg text-primary">{submittedRequestId.substring(0, 8).toUpperCase()}</p>
            </div>

            <div className="flex gap-3">
              <Button onClick={resetForm} className="flex-1">
                طلب جديد
              </Button>
              <Button variant="outline" onClick={() => setViewMode("track")} className="flex-1">
                تتبع طلباتي
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Track View
  if (viewMode === "track") {
    return (
      <div className="min-h-screen bg-background p-4" dir="rtl">
        <div className="max-w-md mx-auto space-y-4">
          <Button variant="ghost" onClick={() => setViewMode("menu")} className="mb-2">
            <ArrowRight className="w-4 h-4 ml-2" />
            رجوع
          </Button>

          <div className="dark-card p-4 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Search className="w-5 h-5" />
              <h2 className="font-semibold">تتبع طلباتي</h2>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="ادخل ايدي غلا لايف"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value.replace(/\D/g, ""))}
                className="text-center font-mono"
              />
              <Button onClick={handleTrack} disabled={isTracking} className="w-full">
                {isTracking ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
              </Button>
            </div>
          </div>

          {trackResults.length > 0 && (
            <div className="space-y-3">
              {trackResults.map((request) => (
                <div key={request.id} className="dark-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-muted-foreground">
                      {request.id.substring(0, 8).toUpperCase()}
                    </span>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">النمط:</span>
                      <span className="font-mono mr-1">{request.pattern_code}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المستوى:</span>
                      <span className="mr-1">{request.user_level}</span>
                    </div>
                  </div>

                  {request.preferred_exact_id && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">الايدي المفضل:</span>
                      <span className="font-mono mr-1">{request.preferred_exact_id}</span>
                    </div>
                  )}

                  {request.rejection_reason && (
                    <div className="p-2 bg-destructive/10 rounded-lg text-sm text-destructive">
                      {request.rejection_reason}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(request.created_at).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Patterns View
  if (viewMode === "patterns") {
    return (
      <div className="min-h-screen bg-background p-4" dir="rtl">
        <div className="max-w-md mx-auto space-y-4">
          <Button variant="ghost" onClick={() => setViewMode("form")} className="mb-2">
            <ArrowRight className="w-4 h-4 ml-2" />
            رجوع
          </Button>

          {/* User Info Display */}
          <div className="dark-card p-3">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Star className="w-4 h-4" />
                المستوى:
                <span className="text-foreground font-bold">{userLevel}</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Hash className="w-4 h-4" />
                الايدي:
                <span className="text-foreground font-mono">{galaUserId}</span>
              </span>
            </div>
          </div>

          {/* Level Tabs */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTabScrollIndex(Math.max(0, tabScrollIndex - 1))}
              disabled={!canScrollLeft}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <div className="flex-1 overflow-hidden">
              <motion.div
                className="flex gap-2"
                animate={{ x: -tabScrollIndex * 110 }}
              >
                {levelTabs.map((level) => {
                  const isEligible = eligibleLevels.includes(level);
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        if (isEligible) {
                          setSelectedLevel(level);
                          setSelectedPattern(null);
                          setSelectedDigitLength(null);
                        }
                      }}
                      disabled={!isEligible}
                      className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        selectedLevel === level
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : isEligible
                          ? "bg-card border border-border text-muted-foreground hover:border-primary/50"
                          : "bg-muted/30 border border-border/30 text-muted-foreground/50 cursor-not-allowed"
                      }`}
                      style={{ minWidth: "100px" }}
                    >
                      Level≥{level}
                      {!isEligible && " 🔒"}
                    </button>
                  );
                })}
              </motion.div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTabScrollIndex(Math.min(levelTabs.length - visibleTabs, tabScrollIndex + 1))}
              disabled={!canScrollRight}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Pattern Tables */}
          <div className="space-y-4">
            {availableDigitLengths.map((digitLength) => {
              const patterns = currentPatterns[digitLength] || [];
              const rows = getPatternRows(patterns);

              return (
                <div key={digitLength} className="dark-card overflow-hidden">
                  {rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-5">
                      {rowIndex === 0 ? (
                        <div className="col-span-1 flex items-center justify-center bg-primary/10 text-primary font-bold p-2 border-b border-l border-border">
                          {digitLength} أرقام
                        </div>
                      ) : (
                        <div className="col-span-1 border-b border-l border-border" />
                      )}

                      <div className="col-span-4 grid grid-cols-4">
                        {row.map((pattern) => (
                          <button
                            key={pattern}
                            onClick={() => handlePatternSelect(pattern, digitLength)}
                            className={`h-11 flex items-center justify-center text-xs font-mono font-semibold transition-all border-b border-l border-border ${
                              selectedPattern === pattern
                                ? "bg-primary/30 text-primary"
                                : "text-foreground/90 hover:bg-primary/10"
                            }`}
                          >
                            {pattern}
                          </button>
                        ))}
                        {Array(4 - row.length)
                          .fill(null)
                          .map((_, i) => (
                            <div key={i} className="border-b border-l border-border" />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Selected Pattern & Submit */}
          <AnimatePresence>
            {selectedPattern && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="dark-card p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">النمط المختار:</span>
                  <span className="font-mono text-lg font-bold text-primary">{selectedPattern}</span>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    الايدي المفضل (اختياري):
                  </Label>
                  <Input
                    value={preferredExactId}
                    onChange={(e) => setPreferredExactId(e.target.value.replace(/\D/g, ""))}
                    placeholder={`مثال: ${generateExampleFromPattern(selectedPattern)}`}
                    className="text-center font-mono text-lg"
                    maxLength={selectedDigitLength || 7}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    سنحاول تخصيص هذا الايدي لك إن كان متاحاً
                  </p>
                </div>

                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 ml-2" />
                      إرسال الطلب
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Form View
  if (viewMode === "form") {
    return (
      <div className="min-h-screen bg-background p-4" dir="rtl">
        <div className="max-w-md mx-auto space-y-4">
          <Button variant="ghost" onClick={() => setViewMode("menu")}>
            <ArrowRight className="w-4 h-4 ml-2" />
            رجوع
          </Button>

          {/* Warning Banner */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold">تحذير مهم!</span>
            </div>
            <p className="text-sm text-destructive/90">
              لو رفعت طلب لايدي مميز وأنت غير مؤهل (مستواك أقل من المطلوب)، سيتم حظرك لمدة 5 ساعات.
              يرجى التأكد من مستواك قبل التقديم.
            </p>
          </div>

          {/* Form Card */}
          <div className="dark-card p-4 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Crown className="w-5 h-5" />
              <h2 className="font-semibold">طلب ايدي مميز</h2>
            </div>

            {/* Step 1: Profile Screenshot Upload - FIRST */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Upload className="w-4 h-4" />
                صورة من صفحة Me في غلا لايف
              </Label>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  ارفع صورة من صفحة الحساب الشخصي (تبويب Me) لنتحقق من مستواك
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExampleDialog(true)}
                  className="text-xs gap-1 shrink-0"
                >
                  <Eye className="w-3 h-3" />
                  مثال
                </Button>
              </div>
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileScreenshotChange}
                  className="hidden"
                  disabled={isVerifying}
                />
                {isVerifying ? (
                  <div className="border-2 border-primary rounded-xl p-8 text-center bg-primary/5">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
                    <p className="text-sm text-primary">جاري التحقق من الصورة...</p>
                  </div>
                ) : previewImage ? (
                  <div className="relative rounded-xl overflow-hidden border-2 border-primary">
                    <img src={previewImage} alt="Preview" className="w-full h-48 object-cover" />
                    {isImageVerified ? (
                      <div className="absolute bottom-2 right-2 bg-success/90 text-success-foreground px-3 py-1 rounded-full text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        تم التحقق ✓
                      </div>
                    ) : (
                      <div className="absolute bottom-2 right-2 bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        فشل التحقق
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">اضغط لرفع صورة من صفحة Me</p>
                    <p className="text-xs text-muted-foreground mt-1">الحد الأقصى: 100MB</p>
                  </div>
                )}
              </label>
            </div>

            {/* Example Image Dialog */}
            <Dialog open={showExampleDialog} onOpenChange={setShowExampleDialog}>
              <DialogContent className="max-w-md p-0 overflow-hidden">
                <div className="relative">
                  <button
                    onClick={() => setShowExampleDialog(false)}
                    className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <img
                    src="/examples/gala-me-page-example.png"
                    alt="مثال صورة صفحة Me"
                    className="w-full h-auto"
                  />
                  <div className="p-4 bg-background">
                    <h3 className="font-bold text-foreground mb-2">مثال على الصورة المطلوبة</h3>
                    <p className="text-sm text-muted-foreground">
                      يجب أن تكون الصورة من صفحة Me (الحساب الشخصي) في تطبيق غلا لايف، 
                      حيث تظهر اللفلات (الأرقام الملونة) في أعلى الصفحة.
                    </p>
                    <div className="mt-3 p-2 bg-primary/10 rounded-lg">
                      <p className="text-xs text-primary">
                        ⭐ يجب أن يكون أحد لفلاتك 30 أو أعلى للتأهل
                      </p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Step 2: Level Display - Only shown after verification */}
            {isImageVerified && verifiedLevel !== null && (
              <div className="space-y-2 p-3 bg-primary/10 rounded-xl border border-primary/30">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-primary">
                    <Star className="w-4 h-4" />
                    مستواك (تم التحقق)
                  </Label>
                  <span className="text-2xl font-bold text-primary">{verifiedLevel}</span>
                </div>
                {allLevels.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    جميع اللفلات: {allLevels.join(' - ')}
                  </p>
                )}
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  مؤهل للحصول على ايدي مميز
                </p>
              </div>
            )}

            {/* Step 3: Gala User ID - Only shown after verification */}
            {isImageVerified && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Hash className="w-4 h-4" />
                    ايدي حسابك في غلا لايف
                  </Label>
                  <Input
                    type="text"
                    placeholder="مثال: 123456789"
                    value={galaUserId}
                    onChange={(e) => setGalaUserId(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-lg font-mono"
                  />
                </div>

                {/* Gala Username (Optional) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-muted-foreground">
                    اسم المستخدم (اختياري)
                  </Label>
                  <Input
                    type="text"
                    placeholder="اسمك في غلا لايف"
                    value={galaUsername}
                    onChange={(e) => setGalaUsername(e.target.value)}
                    className="text-center"
                  />
                </div>

                {/* Proceed Button */}
                <Button
                  onClick={handleProceedToPatterns}
                  disabled={!canProceedToPatterns()}
                  className="w-full"
                >
                  <Sparkles className="w-4 h-4 ml-2" />
                  اختيار نمط الايدي
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Menu View (Default)
  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
            <Crown className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ايدي مميز</h1>
          <p className="text-muted-foreground">احصل على ايدي حسب مستواك</p>
        </div>

        {/* Warning Banner */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <Shield className="w-5 h-5" />
            <span className="font-bold">تنبيه نظامي</span>
          </div>
          <p className="text-sm text-destructive/90">
            لو سمحتوا خلونا نمشي بنظام ✋
          </p>
          <p className="text-sm text-destructive/90">
            إذا رفعت طلب لايدي وأنت مو مؤهل، بيتم حظرك 5 ساعات من الخدمة.
          </p>
        </div>

        {/* Menu Options */}
        <div className="space-y-3">
          <button
            onClick={() => setViewMode("form")}
            className="w-full dark-card p-4 flex items-center gap-4 hover:border-primary/50 transition-colors"
          >
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="font-semibold text-foreground">طلب ايدي مميز</h3>
              <p className="text-sm text-muted-foreground">قدم طلب للحصول على ايدي مميز</p>
            </div>
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => setViewMode("track")}
            className="w-full dark-card p-4 flex items-center gap-4 hover:border-primary/50 transition-colors"
          >
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="font-semibold text-foreground">تتبع طلباتي</h3>
              <p className="text-sm text-muted-foreground">ابحث عن حالة طلباتك السابقة</p>
            </div>
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Back to Home */}
        <Button variant="outline" onClick={() => navigate("/")} className="w-full">
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة للرئيسية
        </Button>
      </div>
    </div>
  );
}
