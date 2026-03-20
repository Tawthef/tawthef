import ShareBanner from "@/components/ShareBanner";

const demoCaption = `🚀 I just joined Tawthef — the AI-powered hiring platform!

My name is miqdad and I'm open to new opportunities as a Career Explorer.

Join the platform: https://tawthef.com

#Tawthef #Hiring #CareerExplorer`;

const BannerPreviewDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-800">Share Banner Preview</h1>
          <p className="text-slate-500 text-sm">Visual verification page — candidate variant</p>
        </div>

        <ShareBanner
          variant="candidate"
          name="miqdad"
          profession="Career Explorer"
          avatarUrl={null}
          caption={demoCaption}
        />
      </div>
    </div>
  );
};

export default BannerPreviewDemo;
