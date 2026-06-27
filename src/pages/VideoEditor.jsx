import ComingSoon from '@/components/shared/ComingSoon';
const META = {
  LegionSpaces: { title:'Legion Spaces', emoji:'🌐', description:'3D social spaces where creators and fans hang out together in real time.', eta:'Q3 2026', suggested:'Explore', suggestedLabel:'Explore Creators', features:['3D avatar hangouts','Live voice rooms','Creator spaces with decor','Cross-stream events','VR support via WebXR'] },
  VideoEditor:  { title:'Video Editor',  emoji:'🎬', description:'A full browser-based video editor for clips, highlights and VOD editing.', eta:'Q4 2026', suggested:'Clips', suggestedLabel:'View Clips', features:['Timeline editor','Clip trimming','Captions & overlays','Export to Shorts / TikTok','Highlight reel generator'] },
}['VideoEditor'] || {};
export default function VideoEditor() {
  return <ComingSoon {...META} />;
}
