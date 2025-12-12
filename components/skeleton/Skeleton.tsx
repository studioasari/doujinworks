export default function Skeleton({ 
  width = '100%', 
  height = '20px', 
  rounded = '4px' 
}: { 
  width?: string
  height?: string
  rounded?: string
}) {
  return (
    <div style={{
      width,
      height,
      backgroundColor: '#F5F5F5',
      borderRadius: rounded
    }} />
  )
}