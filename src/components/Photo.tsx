import { usePhotoUrl } from '../hooks/usePhotoUrl'

/** 有上傳的照片就用上傳的，沒有就用打包的預設圖 */
export default function Photo({ blob, fallback, alt, className = '' }: {
  blob?: Blob
  fallback?: string
  alt: string
  className?: string
}) {
  const uploaded = usePhotoUrl(blob)
  const url = uploaded ?? (fallback ? `${import.meta.env.BASE_URL}${fallback}` : undefined)
  if (!url)
    return (
      <div className={`flex items-center justify-center bg-zinc-800 text-zinc-500 ${className}`}>
        <span className="px-1 text-center text-xs">沒有照片</span>
      </div>
    )
  return <img src={url} alt={alt} className={`object-cover ${className}`} />
}
