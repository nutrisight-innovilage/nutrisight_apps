import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../components/customHeader';

export default function KebijakanPrivasiPage() {
  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <CustomHeader
        heading="Kebijakan Privasi"
        subHeading='perlindungan data anda'
        showBackButton={true}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View className="mb-6">
          <Text className="text-sm text-text-secondary leading-6">
            NutriSight ("kami", "kita", atau "milik kami") berkomitmen untuk melindungi 
            privasi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, 
            menggunakan, mengungkapkan, dan melindungi informasi pribadi Anda ketika Anda 
            menggunakan aplikasi NutriSight. Dengan menggunakan aplikasi kami, Anda menyetujui 
            pengumpulan dan penggunaan informasi sesuai dengan kebijakan ini.
          </Text>
        </View>

        {/* Section 1 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            1. Informasi yang Kami Kumpulkan
          </Text>
          
          <Text className="text-[15px] font-semibold text-text-primary mb-2 mt-3">
            1.1. Informasi yang Anda Berikan
          </Text>
          <Text className="text-sm text-text-secondary leading-6 mb-3">
            Kami mengumpulkan informasi yang Anda berikan secara langsung kepada kami ketika 
            Anda mendaftar untuk akun, menggunakan layanan kami, atau berkomunikasi dengan 
            kami. Informasi ini dapat mencakup nama lengkap, alamat email, kata sandi, 
            tanggal lahir, jenis kelamin, tinggi badan, berat badan, tingkat aktivitas fisik, 
            tujuan kesehatan, preferensi diet, alergi makanan, dan foto profil. Informasi 
            kesehatan dan demografi ini membantu kami memberikan rekomendasi nutrisi yang 
            lebih personal dan akurat sesuai dengan kebutuhan individu Anda.
          </Text>

          <Text className="text-[15px] font-semibold text-text-primary mb-2 mt-3">
            1.2. Informasi yang Dikumpulkan Secara Otomatis
          </Text>
          <Text className="text-sm text-text-secondary leading-6 mb-3">
            Ketika Anda menggunakan aplikasi kami, kami secara otomatis mengumpulkan informasi 
            tertentu tentang perangkat Anda dan penggunaan aplikasi. Ini termasuk jenis 
            perangkat, sistem operasi, pengidentifikasi unik perangkat, alamat IP, informasi 
            jaringan seluler, informasi tentang cara Anda menggunakan aplikasi (seperti fitur 
            yang Anda gunakan, waktu akses, dan halaman yang Anda lihat), serta data log 
            seperti tanggal dan waktu akses. Informasi ini membantu kami memahami bagaimana 
            pengguna berinteraksi dengan aplikasi kami dan memungkinkan kami untuk meningkatkan 
            pengalaman pengguna secara keseluruhan.
          </Text>

          <Text className="text-[15px] font-semibold text-text-primary mb-2 mt-3">
            1.3. Foto Makanan dan Data Pemindaian
          </Text>
          <Text className="text-sm text-text-secondary leading-6">
            Kami mengumpulkan foto makanan yang Anda unggah atau ambil melalui aplikasi untuk 
            tujuan analisis nutrisi menggunakan teknologi kecerdasan buatan kami. Foto-foto 
            ini diproses untuk mengidentifikasi jenis makanan, memperkirakan porsi, dan 
            menghitung kandungan nutrisi. Kami juga menyimpan riwayat pemindaian Anda, 
            termasuk hasil analisis nutrisi, tanggal dan waktu pemindaian, serta catatan atau 
            anotasi yang Anda tambahkan. Data pemindaian ini disimpan dalam akun Anda sehingga 
            Anda dapat melacak asupan nutrisi Anda dari waktu ke waktu dan melihat tren pola 
            makan Anda.
          </Text>
        </View>

        {/* Section 2 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            2. Bagaimana Kami Menggunakan Informasi Anda
          </Text>
          <Text className="text-sm text-text-secondary leading-6 mb-3">
            Kami menggunakan informasi yang kami kumpulkan untuk berbagai tujuan yang 
            bertujuan meningkatkan layanan kami dan pengalaman Anda. Pertama, kami 
            menggunakan informasi Anda untuk menyediakan, memelihara, dan meningkatkan 
            aplikasi dan layanan kami, termasuk menganalisis foto makanan untuk memberikan 
            informasi nutrisi yang akurat. Kami juga menggunakan data Anda untuk 
            mempersonalisasi pengalaman Anda dengan memberikan rekomendasi makanan, saran 
            diet, dan konten yang disesuaikan dengan profil kesehatan dan preferensi Anda.
          </Text>
          <Text className="text-sm text-text-secondary leading-6 mb-3">
            Informasi Anda juga digunakan untuk berkomunikasi dengan Anda, termasuk 
            mengirimkan pembaruan aplikasi, pemberitahuan keamanan, dan pesan dukungan. 
            Kami menggunakan data agregat dan anonim untuk mengembangkan dan meningkatkan 
            algoritma pengenalan makanan dan model kecerdasan buatan kami. Selain itu, kami 
            menggunakan informasi untuk memantau dan menganalisis tren penggunaan, memahami 
            bagaimana pengguna berinteraksi dengan aplikasi kami, dan mengidentifikasi area 
            untuk perbaikan.
          </Text>
          <Text className="text-sm text-text-secondary leading-6">
            Kami juga menggunakan informasi Anda untuk tujuan keamanan, seperti mendeteksi, 
            mencegah, dan menangani aktivitas penipuan atau ilegal, serta untuk menegakkan 
            Syarat dan Ketentuan kami. Terakhir, kami dapat menggunakan informasi Anda untuk 
            mematuhi kewajiban hukum dan peraturan yang berlaku, serta untuk melindungi hak, 
            properti, dan keselamatan NutriSight, pengguna kami, dan publik.
          </Text>
        </View>

        {/* Section 3 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            3. Berbagi dan Pengungkapan Informasi
          </Text>
          <Text className="text-sm text-text-secondary leading-6 mb-3">
            Kami tidak menjual atau menyewakan informasi pribadi Anda kepada pihak ketiga 
            untuk tujuan pemasaran mereka. Namun, kami dapat membagikan informasi Anda dalam 
            situasi tertentu. Kami dapat membagikan informasi dengan penyedia layanan pihak 
            ketiga yang membantu kami mengoperasikan aplikasi, seperti penyedia hosting cloud, 
            layanan analitik, dan dukungan pelanggan. Penyedia layanan ini terikat oleh 
            kewajiban kerahasiaan dan hanya diizinkan menggunakan informasi pribadi Anda 
            untuk melakukan layanan atas nama kami.
          </Text>
          <Text className="text-sm text-text-secondary leading-6 mb-3">
            Kami dapat mengungkapkan informasi Anda jika diwajibkan oleh hukum atau dalam 
            menanggapi proses hukum yang sah, seperti panggilan pengadilan atau perintah 
            pemerintah. Kami juga dapat mengungkapkan informasi jika kami percaya bahwa 
            pengungkapan tersebut diperlukan untuk melindungi hak, properti, atau keselamatan 
            kami, pengguna kami, atau publik, atau untuk mendeteksi, mencegah, atau menangani 
            penipuan, masalah keamanan, atau masalah teknis.
          </Text>
          <Text className="text-sm text-text-secondary leading-6">
            Dalam hal merger, akuisisi, reorganisasi, atau penjualan aset kami, informasi 
            pribadi Anda dapat ditransfer sebagai bagian dari transaksi tersebut. Kami akan 
            memberi tahu Anda melalui email dan/atau pemberitahuan yang jelas di aplikasi 
            kami tentang perubahan kepemilikan atau penggunaan informasi pribadi Anda, serta 
            pilihan yang mungkin Anda miliki terkait informasi pribadi Anda.
          </Text>
        </View>

        {/* Section 4 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            4. Penyimpanan dan Keamanan Data
          </Text>
          <Text className="text-sm text-text-secondary leading-6 mb-3">
            Kami mengambil keamanan informasi pribadi Anda dengan sangat serius dan 
            menerapkan berbagai langkah keamanan untuk melindungi data Anda dari akses, 
            penggunaan, atau pengungkapan yang tidak sah. Semua data yang dikirimkan antara 
            perangkat Anda dan server kami dienkripsi menggunakan protokol Transport Layer 
            Security (TLS) standar industri. Informasi pribadi yang disimpan di server kami 
            dilindungi dengan enkripsi tingkat tinggi saat dalam penyimpanan (encryption at 
            rest).
          </Text>
          <Text className="text-sm text-text-secondary leading-6 mb-3">
            Kami menyimpan data Anda di pusat data yang aman dengan kontrol akses fisik dan 
            elektronik yang ketat. Akses ke informasi pribadi dibatasi hanya untuk karyawan, 
            kontraktor, dan agen yang memerlukan akses tersebut untuk melakukan tugas mereka 
            dan terikat oleh kewajiban kerahasiaan yang ketat. Kami secara rutin memantau 
            sistem kami untuk kemungkinan kerentanan dan serangan, serta melakukan audit 
            keamanan berkala.
          </Text>
          <Text className="text-sm text-text-secondary leading-6">
            Meskipun kami mengambil langkah-langkah yang wajar untuk melindungi informasi 
            pribadi Anda, tidak ada sistem keamanan yang sempurna atau tidak dapat ditembus. 
            Kami tidak dapat menjamin keamanan mutlak dari informasi yang Anda kirimkan ke 
            aplikasi kami, dan setiap transmisi adalah risiko Anda sendiri. Kami mendorong 
            Anda untuk menggunakan kata sandi yang kuat dan unik untuk akun Anda dan tidak 
            membagikan kredensial login Anda dengan siapa pun.
          </Text>
        </View>

        {/* Section 5 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            5. Retensi Data
          </Text>
          <Text className="text-sm text-text-secondary leading-6">
            Kami menyimpan informasi pribadi Anda selama akun Anda aktif atau selama 
            diperlukan untuk menyediakan layanan kepada Anda. Kami juga dapat menyimpan dan 
            menggunakan informasi Anda sejauh diperlukan untuk mematuhi kewajiban hukum kami, 
            menyelesaikan perselisihan, dan menegakkan perjanjian kami. Setelah Anda menghapus 
            akun Anda, kami akan menghapus atau mengagregatkan informasi pribadi Anda dalam 
            waktu 30 hari, kecuali jika penyimpanan lebih lama diperlukan atau diizinkan oleh 
            hukum. Data yang telah diagregatkan dan dianonimkan dapat disimpan untuk jangka 
            waktu yang lebih lama untuk tujuan analisis dan peningkatan layanan, namun data 
            tersebut tidak akan dapat diidentifikasi kembali kepada Anda secara pribadi.
          </Text>
        </View>

        {/* Section 6 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            6. Hak Privasi Anda
          </Text>
          <Text className="text-sm text-text-secondary leading-6 mb-3">
            Anda memiliki hak tertentu terkait dengan informasi pribadi Anda, dan kami 
            berkomitmen untuk menghormati hak-hak tersebut. Anda berhak untuk mengakses 
            informasi pribadi yang kami simpan tentang Anda dan meminta salinan dari data 
            tersebut. Anda dapat mengakses dan memperbarui sebagian besar informasi profil 
            Anda langsung melalui pengaturan akun di aplikasi. Jika Anda ingin mendapatkan 
            salinan lengkap dari data Anda, silakan hubungi kami melalui informasi kontak 
            yang disediakan di bawah.
          </Text>
          <Text className="text-sm text-text-secondary leading-6 mb-3">
            Anda juga berhak untuk memperbaiki informasi pribadi yang tidak akurat atau tidak 
            lengkap. Anda dapat melakukan ini sendiri melalui pengaturan akun atau dengan 
            menghubungi kami untuk bantuan. Anda berhak untuk menghapus atau meminta 
            penghapusan informasi pribadi Anda, dengan tunduk pada kewajiban penyimpanan 
            tertentu yang mungkin kami miliki berdasarkan hukum atau untuk tujuan bisnis yang 
            sah. Untuk menghapus akun Anda, Anda dapat menggunakan opsi "Hapus Akun" dalam 
            pengaturan aplikasi atau menghubungi dukungan pelanggan kami.
          </Text>
          <Text className="text-sm text-text-secondary leading-6">
            Anda memiliki hak untuk menolak pemrosesan informasi pribadi Anda untuk tujuan 
            tertentu, seperti pemasaran langsung. Anda dapat berhenti berlangganan dari 
            komunikasi pemasaran kapan saja dengan mengklik tautan "berhenti berlangganan" 
            dalam email kami atau dengan menyesuaikan preferensi notifikasi Anda di pengaturan 
            aplikasi. Anda juga berhak untuk meminta pembatasan pemrosesan informasi pribadi 
            Anda dalam keadaan tertentu, serta hak untuk portabilitas data, yang berarti 
            Anda dapat meminta kami untuk mentransfer data Anda ke penyedia layanan lain 
            dalam format yang terstruktur dan umum digunakan.
          </Text>
        </View>

        {/* Section 7 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            7. Privasi Anak-anak
          </Text>
          <Text className="text-sm text-text-secondary leading-6">
            Aplikasi kami tidak ditujukan untuk anak-anak di bawah usia 13 tahun, dan kami 
            tidak dengan sengaja mengumpulkan informasi pribadi dari anak-anak di bawah usia 
            13 tahun. Jika kami mengetahui bahwa kami telah mengumpulkan informasi pribadi 
            dari anak di bawah usia 13 tahun tanpa verifikasi persetujuan orang tua, kami 
            akan mengambil langkah-langkah untuk menghapus informasi tersebut dari server 
            kami sesegera mungkin. Jika Anda adalah orang tua atau wali dan Anda percaya 
            bahwa anak Anda yang berusia di bawah 13 tahun telah memberikan informasi pribadi 
            kepada kami, silakan hubungi kami sehingga kami dapat mengambil tindakan yang 
            diperlukan untuk menghapus informasi tersebut.
          </Text>
        </View>

        {/* Section 8 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            8. Transfer Data Internasional
          </Text>
          <Text className="text-sm text-text-secondary leading-6">
            Informasi pribadi Anda mungkin ditransfer ke, dan dipelihara di, komputer yang 
            terletak di luar negara bagian, provinsi, negara, atau yurisdiksi pemerintahan 
            lainnya di mana undang-undang perlindungan data mungkin berbeda dari yang ada di 
            yurisdiksi Anda. Dengan menggunakan aplikasi kami dan menyetujui Kebijakan 
            Privasi ini, Anda menyetujui transfer informasi tersebut ke negara lain dan 
            pemrosesan informasi Anda di negara-negara tersebut. Kami akan mengambil semua 
            langkah yang wajar untuk memastikan bahwa data Anda diperlakukan dengan aman dan 
            sesuai dengan Kebijakan Privasi ini, dan tidak ada transfer informasi pribadi 
            Anda yang akan terjadi ke organisasi atau negara kecuali ada kontrol yang memadai 
            untuk melindungi data Anda dan informasi pribadi lainnya.
          </Text>
        </View>

        {/* Section 9 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            9. Cookie dan Teknologi Pelacakan
          </Text>
          <Text className="text-sm text-text-secondary leading-6">
            Kami menggunakan cookie dan teknologi pelacakan serupa untuk melacak aktivitas 
            di aplikasi kami dan menyimpan informasi tertentu. Cookie adalah file dengan 
            jumlah data kecil yang dapat mencakup pengidentifikasi unik anonim. Kami 
            menggunakan cookie untuk berbagai tujuan, termasuk mengingat preferensi Anda, 
            memahami bagaimana Anda berinteraksi dengan aplikasi kami, mengukur efektivitas 
            kampanye pemasaran kami, dan meningkatkan pengalaman pengguna secara keseluruhan. 
            Anda dapat menginstruksikan browser Anda untuk menolak semua cookie atau untuk 
            menunjukkan kapan cookie sedang dikirim, namun jika Anda tidak menerima cookie, 
            Anda mungkin tidak dapat menggunakan beberapa bagian dari aplikasi kami.
          </Text>
        </View>

        {/* Section 10 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            10. Tautan ke Situs Pihak Ketiga
          </Text>
          <Text className="text-sm text-text-secondary leading-6">
            Aplikasi kami dapat berisi tautan ke situs web atau layanan pihak ketiga yang 
            tidak dimiliki atau dikendalikan oleh NutriSight. Kami tidak memiliki kendali 
            atas, dan tidak bertanggung jawab atas konten, kebijakan privasi, atau praktik 
            dari situs web atau layanan pihak ketiga mana pun. Kami sangat menganjurkan Anda 
            untuk membaca kebijakan privasi dari setiap situs atau layanan yang Anda kunjungi. 
            Tautan ke situs pihak ketiga disediakan hanya untuk kenyamanan Anda, dan 
            penggunaan Anda atas situs-situs tersebut adalah risiko Anda sendiri.
          </Text>
        </View>

        {/* Section 11 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            11. Perubahan pada Kebijakan Privasi
          </Text>
          <Text className="text-sm text-text-secondary leading-6">
            Kami dapat memperbarui Kebijakan Privasi kami dari waktu ke waktu untuk 
            mencerminkan perubahan pada praktik informasi kami atau untuk alasan operasional, 
            hukum, atau peraturan lainnya. Kami akan memberi tahu Anda tentang perubahan 
            material apa pun dengan memposting Kebijakan Privasi yang baru di halaman ini 
            dan memperbarui tanggal "Terakhir Diperbarui" di bagian atas kebijakan. Untuk 
            perubahan signifikan, kami juga dapat memberi tahu Anda melalui email atau melalui 
            pemberitahuan di dalam aplikasi sebelum perubahan menjadi efektif. Kami mendorong 
            Anda untuk meninjau Kebijakan Privasi ini secara berkala untuk tetap mendapat 
            informasi tentang bagaimana kami melindungi informasi pribadi Anda. Penggunaan 
            Anda yang berkelanjutan atas aplikasi setelah perubahan diposting akan dianggap 
            sebagai penerimaan Anda atas perubahan tersebut.
          </Text>
        </View>

        {/* Section 12 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text-primary mb-3">
            12. Hubungi Kami
          </Text>
          <Text className="text-sm text-text-secondary leading-6 mb-3">
            Jika Anda memiliki pertanyaan, kekhawatiran, atau permintaan terkait Kebijakan 
            Privasi ini atau praktik privasi kami, silakan hubungi kami melalui:
          </Text>
          <View className="bg-overlay rounded-lg p-4" style={{ gap: 8 }}>
            <Text className="text-sm text-text-primary">
              <Text className="font-semibold">Email:</Text> privacy@nutrisight.com
            </Text>
            <Text className="text-sm text-text-primary">
              <Text className="font-semibold">Website:</Text> www.nutrisight.com/contact
            </Text>
            <Text className="text-sm text-text-primary">
              <Text className="font-semibold">Alamat:</Text> NutriSight Indonesia, Jl. Teknologi No. 123, Jakarta 12345, Indonesia
            </Text>
          </View>
          <Text className="text-sm text-text-secondary leading-6 mt-3">
            Kami berkomitmen untuk menyelesaikan keluhan tentang privasi dan pengumpulan atau 
            penggunaan informasi pribadi Anda. Jika Anda memiliki pertanyaan atau keluhan 
            mengenai kebijakan privasi kami, silakan hubungi kami terlebih dahulu. Kami akan 
            menyelidiki dan berusaha untuk menyelesaikan keluhan dan perselisihan mengenai 
            penggunaan dan pengungkapan informasi pribadi sesuai dengan prinsip-prinsip yang 
            terkandung dalam Kebijakan Privasi ini.
          </Text>
        </View>

        {/* Consent Notice */}
        <View className="mt-4 bg-primary/10 rounded-lg p-4 flex-row" style={{ gap: 12 }}>
          <Ionicons name="shield-checkmark" size={20} color="#37B37E" />
          <Text className="flex-1 text-xs text-text-secondary leading-5">
            Dengan menggunakan aplikasi NutriSight, Anda mengakui bahwa Anda telah membaca 
            dan memahami Kebijakan Privasi ini dan menyetujui pengumpulan, penggunaan, dan 
            pengungkapan informasi pribadi Anda sebagaimana dijelaskan di sini.
          </Text>
        </View>

        <View className="h-6" />
      </ScrollView>
    </View>
  );
}