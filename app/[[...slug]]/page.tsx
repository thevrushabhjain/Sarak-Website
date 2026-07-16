import SarakSite from '@/components/SarakSite';
export default async function Page({params}:{params:Promise<{slug?:string[]}>}){const {slug=[]}=await params;return <SarakSite path={'/'+slug.join('/')} />}
