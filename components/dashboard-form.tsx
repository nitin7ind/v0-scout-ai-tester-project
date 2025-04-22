"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCurrentDate } from "@/lib/utils"

interface DashboardFormProps {
  onSubmit: (formData: FormData) => Promise<void>
}

export default function DashboardForm({ onSubmit }: DashboardFormProps) {
  const [inputType, setInputType] = useState<"scoutai" | "manual">("scoutai")
  const currentDate = getCurrentDate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    await onSubmit(formData)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              name="prompt"
              placeholder="Enter prompt for image analysis"
              className="min-h-32"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Select Image Input Method</Label>
            <RadioGroup
              defaultValue="scoutai"
              name="input_type"
              onValueChange={(value) => setInputType(value as "scoutai" | "manual")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scoutai" id="scoutai" />
                <Label htmlFor="scoutai">ScoutAI API</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual">Manual Upload or URL</Label>
              </div>
            </RadioGroup>
          </div>

          {inputType === "scoutai" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="env">Environment</Label>
                  <Select name="env" defaultValue="prod">
                    <SelectTrigger>
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prod">Production</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_id">Company ID</Label>
                  <Input id="company_id" name="company_id" placeholder="Company ID" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location_id">Location ID (optional)</Label>
                  <Input id="location_id" name="location_id" placeholder="Location ID" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" name="date" type="date" defaultValue={currentDate} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start">Start Index</Label>
                  <Input id="start" name="start" type="number" min="0" defaultValue="0" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end">End Index</Label>
                  <Input id="end" name="end" type="number" min="1" defaultValue="5" required />
                </div>
              </div>
            </div>
          )}

          {inputType === "manual" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual_image">Upload Image</Label>
                <Input id="manual_image" name="manual_image" type="file" accept="image/*" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual_url">Or paste image URL</Label>
                <Input id="manual_url" name="manual_url" placeholder="https://example.com/image.jpg" />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full">
            Analyze
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
