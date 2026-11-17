import { ProductDetail } from '@/components/product-detail';
export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ProductDetail id={id}/>; }
