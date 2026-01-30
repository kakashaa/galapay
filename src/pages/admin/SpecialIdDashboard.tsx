import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Crown,
  ArrowRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  Ban,
  RefreshCw,
  Star,
  Hash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SpecialIdRequest {
  id: string;
  gala_user_id: string;
  gala_username: string | null;
  user_level: number;
  digit_length: number;
  pattern_code: string;
  preferred_exact_id: string | null;
  profile_screenshot_url: string;
  ai_verified_level: number | null;
  ai_verification_status: string;
  ai_notes: string | null;
  status: string;
  admin_notes: string | null;
  rejection_reason: string | null;
  ban_expires_at: string | null;
  processed_at: string | null;
  created_at: string;
}

export default function SpecialIdDashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SpecialIdRequest[]>([]);
  const [allRequests, setAllRequests] = useState<SpecialIdRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<SpecialIdRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      const { data, error } = await supabase
        .from("special_id_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllRequests(data || []);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("special_id_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("خطأ في تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    pending: allRequests.filter(r => r.status === "pending").length,
    approved: allRequests.filter(r => r.status === "approved").length,
    rejected: allRequests.filter(r => r.status === "rejected").length,
    banned: allRequests.filter(r => r.status === "banned").length,
    total: allRequests.length,
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("special_id_requests")
        .update({
          status: "approved",
          admin_notes: adminNotes || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success("تمت الموافقة على الطلب");
      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("خطأ في الموافقة على الطلب");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      toast.error("يرجى إدخال سبب الرفض");
      return;
    }
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("special_id_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          admin_notes: adminNotes || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success("تم رفض الطلب");
      setSelectedRequest(null);
      setAdminNotes("");
      setRejectionReason("");
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("خطأ في رفض الطلب");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBan = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      const banExpiresAt = new Date();
      banExpiresAt.setHours(banExpiresAt.getHours() + 5);

      const { error } = await supabase
        .from("special_id_requests")
        .update({
          status: "banned",
          rejection_reason: rejectionReason || "طلب غير مؤهل - تم الحظر 5 ساعات",
          admin_notes: adminNotes || null,
          ban_expires_at: banExpiresAt.toISOString(),
          processed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success("تم حظر المستخدم لمدة 5 ساعات");
      setSelectedRequest(null);
      setAdminNotes("");
      setRejectionReason("");
      fetchRequests();
    } catch (error) {
      console.error("Error banning:", error);
      toast.error("خطأ في حظر المستخدم");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" /> قيد المراجعة
          </span>
        );
      case "approved":
        return (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> تمت الموافقة
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs flex items-center gap-1">
            <XCircle className="w-3 h-3" /> مرفوض
          </span>
        );
      case "banned":
        return (
          <span className="px-2 py-1 bg-red-600/30 text-red-500 rounded-full text-xs flex items-center gap-1">
            <Ban className="w-3 h-3" /> محظور
          </span>
        );
      default:
        return null;
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (!searchQuery.trim()) return true;
    return (
      req.gala_user_id.includes(searchQuery) ||
      req.gala_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.pattern_code.includes(searchQuery)
    );
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            <ArrowRight className="w-4 h-4 ml-2" />
            رجوع
          </Button>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">إدارة الايدي المميز</h1>
            {pendingCount > 0 && (
              <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">
                {pendingCount}
              </span>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={fetchRequests}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="dark-card p-3 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">قيد المراجعة</p>
          </div>
          <div className="dark-card p-3 text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">موافق عليها</p>
          </div>
          <div className="dark-card p-3 text-center">
            <XCircle className="w-5 h-5 mx-auto mb-1 text-red-400" />
            <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">مرفوضة</p>
          </div>
          <div className="dark-card p-3 text-center">
            <Ban className="w-5 h-5 mx-auto mb-1 text-red-600" />
            <p className="text-2xl font-bold text-red-600">{stats.banned}</p>
            <p className="text-xs text-muted-foreground">محظورين</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="dark-card p-4 space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالايدي أو الاسم أو النمط..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { value: "pending", label: `قيد المراجعة (${stats.pending})` },
              { value: "approved", label: `موافق عليها (${stats.approved})` },
              { value: "rejected", label: `مرفوضة (${stats.rejected})` },
              { value: "banned", label: `محظورين (${stats.banned})` },
              { value: "all", label: `الكل (${stats.total})` },
            ].map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="dark-card p-8 text-center text-muted-foreground">
            <Crown className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد طلبات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <div key={request.id} className="dark-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        #{request.id.substring(0, 8).toUpperCase()}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3 text-muted-foreground" />
                        {request.gala_user_id}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-muted-foreground" />
                        Lv.{request.user_level}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setAdminNotes(request.admin_notes || "");
                      setRejectionReason(request.rejection_reason || "");
                    }}
                  >
                    <Eye className="w-4 h-4 ml-1" />
                    عرض
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="bg-primary/10 px-3 py-1 rounded-lg">
                    <span className="text-muted-foreground">النمط: </span>
                    <span className="font-mono font-bold text-primary">
                      {request.pattern_code}
                    </span>
                  </div>
                  <div className="bg-muted px-3 py-1 rounded-lg">
                    <span className="text-muted-foreground">الأرقام: </span>
                    <span className="font-bold">{request.digit_length}</span>
                  </div>
                  {request.preferred_exact_id && (
                    <div className="bg-muted px-3 py-1 rounded-lg">
                      <span className="text-muted-foreground">المفضل: </span>
                      <span className="font-mono">{request.preferred_exact_id}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  {new Date(request.created_at).toLocaleString("ar-SA")}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Request Details Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                تفاصيل الطلب
              </DialogTitle>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                {/* Screenshot */}
                <div className="rounded-xl overflow-hidden border border-border">
                  <img
                    src={selectedRequest.profile_screenshot_url}
                    alt="Profile Screenshot"
                    className="w-full h-auto"
                  />
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="dark-card p-3">
                    <span className="text-muted-foreground block">ايدي غلا:</span>
                    <span className="font-mono font-bold">{selectedRequest.gala_user_id}</span>
                  </div>
                  <div className="dark-card p-3">
                    <span className="text-muted-foreground block">المستوى:</span>
                    <span className="font-bold">{selectedRequest.user_level}</span>
                  </div>
                  <div className="dark-card p-3">
                    <span className="text-muted-foreground block">النمط:</span>
                    <span className="font-mono font-bold text-primary">
                      {selectedRequest.pattern_code}
                    </span>
                  </div>
                  <div className="dark-card p-3">
                    <span className="text-muted-foreground block">عدد الأرقام:</span>
                    <span className="font-bold">{selectedRequest.digit_length}</span>
                  </div>
                </div>

                {selectedRequest.preferred_exact_id && (
                  <div className="dark-card p-3">
                    <span className="text-muted-foreground block text-sm">الايدي المفضل:</span>
                    <span className="font-mono font-bold text-lg">
                      {selectedRequest.preferred_exact_id}
                    </span>
                  </div>
                )}

                {selectedRequest.gala_username && (
                  <div className="dark-card p-3">
                    <span className="text-muted-foreground block text-sm">اسم المستخدم:</span>
                    <span className="font-bold">{selectedRequest.gala_username}</span>
                  </div>
                )}

                {/* Admin Actions */}
                {selectedRequest.status === "pending" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">ملاحظات المسؤول:</label>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="ملاحظات داخلية..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">سبب الرفض (للرفض أو الحظر):</label>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="سبب الرفض..."
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleApprove}
                        disabled={isProcessing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 ml-1" />
                            موافقة
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleReject}
                        disabled={isProcessing}
                        variant="outline"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 ml-1" />
                        رفض
                      </Button>
                      <Button
                        onClick={handleBan}
                        disabled={isProcessing}
                        variant="destructive"
                        className="flex-1"
                      >
                        <Ban className="w-4 h-4 ml-1" />
                        حظر 5 ساعات
                      </Button>
                    </div>
                  </>
                )}

                {selectedRequest.status !== "pending" && (
                  <div className="space-y-2">
                    {selectedRequest.admin_notes && (
                      <div className="dark-card p-3">
                        <span className="text-muted-foreground block text-sm">ملاحظات المسؤول:</span>
                        <p>{selectedRequest.admin_notes}</p>
                      </div>
                    )}
                    {selectedRequest.rejection_reason && (
                      <div className="bg-destructive/10 p-3 rounded-lg">
                        <span className="text-destructive block text-sm">سبب الرفض:</span>
                        <p className="text-destructive">{selectedRequest.rejection_reason}</p>
                      </div>
                    )}
                    {selectedRequest.ban_expires_at && (
                      <div className="bg-destructive/10 p-3 rounded-lg">
                        <span className="text-destructive block text-sm">انتهاء الحظر:</span>
                        <p className="text-destructive">
                          {new Date(selectedRequest.ban_expires_at).toLocaleString("ar-SA")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
