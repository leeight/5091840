"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  Code2, 
  Palette, 
  Smartphone, 
  Layout, 
  Database, 
  Shield, 
  Zap,
  ChevronRight
} from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const { toast } = useToast()

  const features = [
    {
      icon: <Code2 className="h-6 w-6" />,
      title: "Modern Development",
      description: "Using the latest technologies including React, TypeScript, and Next.js"
    },
    {
      icon: <Palette className="h-6 w-6" />,
      title: "Beautiful Design",
      description: "Creating stunning user interfaces with Shadcn/UI and Tailwind CSS"
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Responsive Layout",
      description: "Ensuring perfect display across all devices and screen sizes"
    },
    {
      icon: <Layout className="h-6 w-6" />,
      title: "Component Library",
      description: "Extensive collection of reusable UI components"
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: "Database Integration",
      description: "Seamless integration with Supabase for data management"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Authentication",
      description: "Secure user authentication and authorization"
    }
  ]

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      {/* Hero Section */}
      <section className="w-full min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto text-center animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Building Amazing Web Experiences
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Creating modern, responsive, and beautiful web applications using cutting-edge technologies
          </p>
          <Button 
            size="lg" 
            className="animate-slide-up"
            onClick={() => {
              toast({
                title: "Welcome!",
                description: "Thank you for your interest. Let's create something amazing together!",
              })
            }}
          >
            Get Started <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-20 px-4 bg-secondary">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What I Can Do
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="w-full py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">
            Powered by Modern Technology
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-8">
            <div className="flex flex-col items-center">
              <Zap className="h-12 w-12 text-primary mb-2" />
              <span className="font-semibold">Next.js 14+</span>
            </div>
            <Image
              src="https://image.coze.run/?prompt=Modern%20technology%20stack%20with%20React,%20TypeScript,%20and%20web%20development%20tools%20in%20a%20clean%20minimalist%20style&image_size=square_hd"
              alt="Tech Stack"
              width={400}
              height={400}
              className="rounded-lg shadow-xl"
            />
          </div>
        </div>
      </section>
    </main>
  )
}
