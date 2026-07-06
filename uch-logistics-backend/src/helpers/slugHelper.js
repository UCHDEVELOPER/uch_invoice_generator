export function generateSlug(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")    
    .replace(/\s+/g, "-")        
    .replace(/-+/g, "-")        
    .replace(/^-+|-+$/g, "");  
}