import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sparkles,
  Calendar,
  Image as ImageIcon,
  Dice5,
  Shield,
  Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const btnClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

export default async function LandingPage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-bold text-primary">
            <Home className="h-6 w-6" aria-hidden />
            <span>Tết Connect</span>
          </div>
          <nav className="flex items-center gap-2">
            {session?.user ? (
              <Link
                href="/dashboard"
                className={cn(btnClass, 'bg-primary text-primary-foreground hover:bg-primary/90')}
              >
                Vào Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(btnClass, 'hover:bg-accent hover:text-accent-foreground')}
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className={cn(btnClass, 'bg-primary text-primary-foreground hover:bg-primary/90')}
                >
                  Tạo tài khoản
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-[var(--tet-red-soft)] via-background to-[var(--tet-gold-soft)] px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
              Tết Nguyên Đán
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              Tết là để về nhà
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Không gian riêng tư cho gia đình Việt: câu đối AI, lịch họp mặt, album ảnh
              và Bầu Cua điểm ảo — ấm cúng, an toàn, sẵn sàng cho mùa Tết.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={session ? '/family/create' : '/register'}
                className={cn(
                  btnClass,
                  'min-w-[180px] bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                Tạo nhà
              </Link>
              <Link
                href={session ? '/dashboard' : '/login'}
                className={cn(
                  btnClass,
                  'min-w-[180px] border border-input bg-background hover:bg-accent'
                )}
              >
                Tham gia bằng mã
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">
            Mọi thứ cần cho cái Tết sum vầy
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Sparkles,
                title: 'AI câu đối & lời chúc',
                desc: 'Sinh nội dung Tết cá nhân hóa, đăng thẳng lên tường nhà.',
              },
              {
                icon: Calendar,
                title: 'Sự kiện & việc nhà',
                desc: 'Lịch họp mặt, phân công, nhắc việc trước giờ G.',
              },
              {
                icon: ImageIcon,
                title: 'Album gia đình',
                desc: 'Lưu khoảnh khắc, timeline ảnh, video recap.',
              },
              {
                icon: Dice5,
                title: 'Bầu Cua online',
                desc: 'Chơi điểm ảo trong nhà — không tiền thật, không thanh toán.',
              },
            ].map((item) => (
              <Card key={item.title} className="border-border bg-card shadow-sm">
                <CardHeader>
                  <item.icon className="mb-2 h-8 w-8 text-primary" aria-hidden />
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {item.desc}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/40 px-4 py-14">
          <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 md:flex-row md:items-center">
            <Shield className="h-12 w-12 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="text-xl font-bold">Riêng tư trong từng “nhà”</h2>
              <p className="mt-2 text-muted-foreground">
                Dữ liệu gắn với gia đình bạn. Thành viên chỉ xem nội dung của nhà mình.
                Đăng nhập Google hoặc email — không quảng cáo công khai album gia đình.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-muted-foreground md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} Tết Connect</p>
          <div className="flex flex-wrap gap-4">
            <span>Privacy (sắp có)</span>
            <span>Terms (sắp có)</span>
            <a className="hover:text-foreground" href="mailto:hello@tetconnect.local">
              Liên hệ
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
