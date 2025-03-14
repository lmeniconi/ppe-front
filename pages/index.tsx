import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ChevronRight, Upload } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL!

type ApiFile = {
  id: string
  filename: string
}

type Event = {
  event: string
  filename: string
  time: string
}

export default function Page() {
  // upload file
  const [uploadApiFile, setUploadApiFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()

    if (!uploadApiFile) {
      return
    }

    try {
      setSubmitting(true)

      const formData = new FormData()
      formData.append("file", uploadApiFile)

      const res = await fetch(`${API_URL}/videos`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        throw new Error("Failed to upload file")
      }
      toast.success("Archivo subido correctamente")

      const video = (await res.json()) as ApiFile
      setSelectedVideo(video)
    } catch (error) {
      console.error(error)
      toast.error("Ocurrió un error al subir el archivo")
    } finally {
      setSubmitting(false)
    }
  }

  // selected video
  const [selectedVideo, setSelectedVideo] = useState<ApiFile | null>()

  // events
  const [events, setEvents] = useState<Event[]>([])
  useEffect(() => {
    if (!selectedVideo) {
      return
    }

    const socket = new WebSocket(
      `${API_URL.replace("http://", "ws://")}/videos/${selectedVideo.filename}/inference/detections/ws`,
    )

    socket.onopen = () => {
      console.log("socket opened")
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as Event
      toast.info(data.event)
      setEvents((prev) => [data, ...prev])
    }

    socket.onclose = () => {
      console.log("socket closed")
    }

    return () => {
      socket.close()
    }
  }, [selectedVideo])

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  if (!selectedVideo) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Subir Archivo</CardTitle>
            <CardDescription>
              Selecciona un archivo para subir a nuestra plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Archivo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => {
                      if (!e.target.files?.length) {
                        return
                      }

                      const file = e.target.files[0]
                      setUploadApiFile(file)
                    }}
                    className="flex-1"
                  />
                </div>
              </div>

              {uploadApiFile && (
                <div className="text-sm text-muted-foreground">
                  Archivo seleccionado:{" "}
                  <span className="font-medium">{uploadApiFile.name}</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <form onSubmit={submit} className="w-full">
              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={!uploadApiFile || submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Subiendo...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Subir Archivo
                  </span>
                )}
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="flex-1 flex justify-center items-center h-full">
        <div className="relative">
          <img
            src={`${API_URL}/videos/${selectedVideo.filename}/inference`}
            width={1280}
            height={720}
          />

          <div className="absolute left-0 bottom-0 bg-gradient-to-t from-black to-transparent p-4">
            <h2 className="text-2xl font-bold text-white">Cámara Principal</h2>
            <p className="text-gray-200">Transmisión en vivo</p>
          </div>
        </div>
      </div>

      <div className="w-96 bg-gray-900 p-6 overflow-hidden flex flex-col">
        <div className="mb-6">
          <div>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <p className="text-sm text-gray-300 text-center">
                  Eventos Totales
                </p>
                <p className="text-2xl font-bold text-white text-center">
                  {events.length}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {selectedEvent && (
            <Button
              onClick={() => {
                setSelectedEvent(null)
              }}
              variant="ghost"
              className="text-white cursor-pointer hover:text-white"
            >
              Volver atrás
            </Button>
          )}

          <h3 className="text-xl font-semibold mb-4 text-white">
            {selectedEvent ? "Detalle Evento" : "Eventos Recientes"}
          </h3>

          {!!selectedEvent && (
            <div className="space-y-2 text-white">
              <div>
                <p>Evento: {selectedEvent.event}</p>
              </div>
              <div>
                <p>
                  Fecha: {new Date(selectedEvent.time).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p>Hora: {new Date(selectedEvent.time).toLocaleTimeString()}</p>
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <AnimatePresence>
            {selectedEvent ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="mb-3"
              >
                <video width="600" controls>
                  <source
                    src={`${API_URL}/videos/${selectedEvent.filename}`}
                    type="video/mp4"
                  />
                </video>
              </motion.div>
            ) : (
              <>
                {events.map((event, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="mb-3"
                  >
                    <Card
                      className="bg-gray-800 border-gray-700 cursor-pointer hover:"
                      onClick={() => {
                        setSelectedEvent(event)
                      }}
                    >
                      <CardContent className="p-3 flex items-center">
                        <AlertCircle className="w-5 h-5 text-yellow-400 mr-3" />
                        <span className="text-white block">{event.event}</span>
                        <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                      </CardContent>
                      <CardFooter>
                        <span className="text-xs text-gray-400">
                          {new Date(event.time).toLocaleString()}
                        </span>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>
        </ScrollArea>
      </div>
    </div>
  )
}
