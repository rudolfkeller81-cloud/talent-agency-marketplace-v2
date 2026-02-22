// Configuration Supabase
const SUPABASE_CONFIG = {
    url: 'https://ddifdvxghdonoqnmoiyo.supabase.co/', // Remplacez avec votre Project URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkaWZkdnhnaGRvbm9xbm1vaXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDgwNzksImV4cCI6MjA4NDMyNDA3OX0.FXaPSTClsF9RgTooiFWSgQP4NBCIJdl2azH5VeN2fc0' // Remplacez avec votre Anon Public Key
};

// Exporter pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
} else {
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}
