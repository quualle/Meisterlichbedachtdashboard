export interface Database {
  public: {
    Tables: {
      billing_units: {
        Row: {
          id: string
          name: string
          abbreviation: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          abbreviation: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          abbreviation?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employee_roles: {
        Row: {
          id: string
          name: string
          hourly_rate: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          hourly_rate: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          hourly_rate?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          role_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          role_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          role_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          company_name: string | null
          first_name: string | null
          last_name: string | null
          street: string | null
          house_number: string | null
          postal_code: string | null
          city: string | null
          email: string | null
          phone: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name?: string | null
          first_name?: string | null
          last_name?: string | null
          street?: string | null
          house_number?: string | null
          postal_code?: string | null
          city?: string | null
          email?: string | null
          phone?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string | null
          first_name?: string | null
          last_name?: string | null
          street?: string | null
          house_number?: string | null
          postal_code?: string | null
          city?: string | null
          email?: string | null
          phone?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      item_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      items: {
        Row: {
          id: string
          name: string
          description: string | null
          item_type: 'material' | 'service'
          category_id: string | null
          billing_unit_id: string | null
          default_price: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          item_type: 'material' | 'service'
          category_id?: string | null
          billing_unit_id?: string | null
          default_price?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          item_type?: 'material' | 'service'
          category_id?: string | null
          billing_unit_id?: string | null
          default_price?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          filename: string
          original_filename: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          customer_id: string | null
          description: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          filename: string
          original_filename: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          customer_id?: string | null
          description?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          filename?: string
          original_filename?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          customer_id?: string | null
          description?: string | null
          uploaded_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          customer_id: string
          invoice_date: string
          due_date: string | null
          status: 'draft' | 'sent' | 'paid' | 'cancelled'
          notes: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          customer_id: string
          invoice_date?: string
          due_date?: string | null
          status?: 'draft' | 'sent' | 'paid' | 'cancelled'
          notes?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          customer_id?: string
          invoice_date?: string
          due_date?: string | null
          status?: 'draft' | 'sent' | 'paid' | 'cancelled'
          notes?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          item_id: string | null
          employee_id: string | null
          description: string
          quantity: number
          billing_unit_id: string | null
          unit_price: number
          total_price: number
          position_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          item_id?: string | null
          employee_id?: string | null
          description: string
          quantity?: number
          billing_unit_id?: string | null
          unit_price: number
          total_price: number
          position_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          item_id?: string | null
          employee_id?: string | null
          description?: string
          quantity?: number
          billing_unit_id?: string | null
          unit_price?: number
          total_price?: number
          position_order?: number | null
          created_at?: string
        }
      }
    }
  }
}

// Helper types
export type BillingUnit = Database['public']['Tables']['billing_units']['Row']
export type EmployeeRole = Database['public']['Tables']['employee_roles']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type ItemCategory = Database['public']['Tables']['item_categories']['Row']
export type Item = Database['public']['Tables']['items']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']

// Extended types with relations
export type EmployeeWithRole = Employee & {
  employee_roles: EmployeeRole | null
}

export type ItemWithRelations = Item & {
  item_categories: ItemCategory | null
  billing_units: BillingUnit | null
}
