import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';

// A placeholder for social icons
const SocialIcon = ({ name, ...props }: { name: string } & React.ComponentProps<'svg'>) => (
  <svg {...props}>
    <title>{name}</title>
    <use href={`#${name.toLowerCase()}`} />
  </svg>
);


export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Icons.logo className="h-6 w-6" />
            <span className="font-headline text-xl font-bold">Al Chile Delivery</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Al Chile Inc. All rights reserved.
          </p>
          <div className="flex gap-2 mt-4 md:mt-0">
             {/* In a real app, these would be proper icons */}
            <Button variant="ghost" size="icon" asChild>
                <Link href="#" aria-label="Facebook">
                    <svg width="20" height="20" fill="currentColor"><path d="M10 0C4.477 0 0 4.477 0 10c0 5.523 4.477 10 10 10s10-4.477 10-10C20 4.477 15.523 0 10 0zm2.937 10.625H11.25V17.5h-2.5V10.625H7.5V8.125h1.25V6.5c0-1.25.75-2.5 2.5-2.5h1.875v2.5H11.25c-.25 0-.625.125-.625.625v.5h2.313l-.438 2.5z"/></svg>
                </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
                <Link href="#" aria-label="Instagram">
                    <svg width="20" height="20" fill="currentColor"><path d="M10 0C4.477 0 0 4.477 0 10c0 5.523 4.477 10 10 10s10-4.477 10-10C20 4.477 15.523 0 10 0zm5 10c0 2.761-2.239 5-5 5s-5-2.239-5-5 2.239-5 5-5 5 2.239 5 5zm-5 3.125c-1.725 0-3.125-1.4-3.125-3.125S8.275 6.875 10 6.875 13.125 8.275 13.125 10 11.725 13.125 10 13.125zm3.438-4.375c-.518 0-.938-.42-.938-.938s.42-.938.938-.938.938.42.938.938-.42.938-.938.938z"/></svg>
                </Link>
            </Button>
             <Button variant="ghost" size="icon" asChild>
                <Link href="#" aria-label="Twitter">
                    <svg width="20" height="20" fill="currentColor"><path d="M10 0C4.477 0 0 4.477 0 10c0 5.523 4.477 10 10 10s10-4.477 10-10C20 4.477 15.523 0 10 0zm5.05 7.05c.01.1.01.21.01.31 0 3.22-2.45 6.95-6.95 6.95-1.38 0-2.66-.4-3.74-1.1.19.02.38.03.58.03 1.14 0 2.2-.39 3.03-1.05-.98-.02-1.8-1.3-2.09-2.13.35.07.6.05.84-.04-.92-.19-1.8-1.01-1.8-2.05v-.03c.53.3 1.14.48 1.8.5C4.01 7.4 3.3 5.75 4.09 4.6c1.1 1.35 2.75 2.25 4.6 2.33-.08-.3-.12-.61-.12-.93 0-2.25 1.82-4.07 4.07-4.07.9 0 1.76.38 2.35 1 .71-.14 1.38-.4 1.98-.75-.23.73-.73 1.35-1.38 1.74.63-.08 1.23-.24 1.77-.48-.42.63-.95 1.18-1.57 1.65z"/></svg>
                </Link>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
