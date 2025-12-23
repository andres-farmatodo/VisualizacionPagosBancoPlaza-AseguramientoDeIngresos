import Image from "next/image"

export default function FarmatodoLogo({ className = "w-48" }: { className?: string }) {
  return (
    <div className={className}>
      <Image 
        src="/Vertica-Azul.png" 
        alt="Farmatodo Logo" 
        width={400} 
        height={460}
        className="w-full h-auto"
        priority
      />
    </div>
  )
}

