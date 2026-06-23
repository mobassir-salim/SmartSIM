from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# SIM schemas
class SimBase(BaseModel):
    name: str
    type: str
    price: float
    description: Optional[str] = None
    iccid_prefix: str

class SimCreate(SimBase):
    pass

class SimUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    iccid_prefix: Optional[str] = None
    is_active: Optional[bool] = None

class SimOut(SimBase):
    id: int
    is_active: bool
    created_at: datetime
    available_stock: Optional[int] = Field(default=None, description="Number of available SIM units in inventory")

    class Config:
        from_attributes = True

# SIM Availability response
class SimAvailability(BaseModel):
    sim_id: int
    name: str
    is_active: bool
    available_stock: int
    assigned_stock: int
    total_stock: int

# SimInventory schemas
class SimInventoryBase(BaseModel):
    sim_id: int
    iccid: str
    status: Optional[str] = "available"

class SimInventoryCreate(SimInventoryBase):
    pass

class SimInventoryOut(SimInventoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
