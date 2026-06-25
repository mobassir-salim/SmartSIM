import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api.deps import get_db, get_current_crm_admin, TokenData
from app.models.user import User
from app.models.customer_profile import CustomerProfile
from app.models.customer_plan_history import CustomerPlanHistory
from app.models.customer_activity import CustomerActivity
from app.schemas.crm import CustomerProfileOut, CustomerUpdate

router = APIRouter()
logger = logging.getLogger("auth-service")


def get_or_create_profile(db: Session, user_id: int) -> CustomerProfile:
    profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == user_id).first()
    if not profile:
        profile = CustomerProfile(user_id=user_id, address="", notes="", status="ACTIVE")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


# ─── CRM Customer Details ────────────────────────────────────────────────────

@router.get("/customer/{id}", response_model=CustomerProfileOut)
def get_customer_details(
    id: int,
    admin: TokenData = Depends(get_current_crm_admin),
    db: Session = Depends(get_db)
):
    """Retrieve complete customer profile lifecycle details."""
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    profile = get_or_create_profile(db, id)
    
    # 1. Fetch SIM details from sim_assignment & sim_inventory via direct SQL
    sims = []
    try:
        sim_query = text(
            "SELECT sa.msisdn, si.iccid, si.imsi, si.status, sa.assigned_at "
            "FROM sim_assignment sa "
            "JOIN sim_inventory si ON sa.inventory_id = si.id "
            "WHERE sa.customer_id = :customer_id"
        )
        sim_rows = db.execute(sim_query, {"customer_id": id}).fetchall()
        for r in sim_rows:
            sims.append({
                "msisdn": r[0],
                "iccid": r[1],
                "imsi": r[2],
                "status": r[3],
                "activated_at": r[4]
            })
    except Exception as e:
        logger.error(f"Error fetching SIM data for CRM: {e}")
    
    # 2. Fetch Plan history
    plans = db.query(CustomerPlanHistory).filter(CustomerPlanHistory.user_id == id).all()
    plan_list = []
    for p in plans:
        plan_list.append({
            "plan_id": p.plan_id,
            "plan_name": p.plan_name,
            "activated_at": p.activated_at,
            "expires_at": p.expires_at,
            "status": p.status
        })
    
    # 3. Fetch Wallet & Transaction details from wallets & wallet_transactions via direct SQL
    wallet_info = None
    try:
        wallet_query = text("SELECT id, balance, currency FROM wallets WHERE user_id = :user_id")
        wallet_row = db.execute(wallet_query, {"user_id": str(id)}).fetchone()
        if wallet_row:
            wallet_id, balance, currency = wallet_row
            
            tx_query = text(
                "SELECT transaction_type, amount, description, reference_id, status, created_at "
                "FROM wallet_transactions "
                "WHERE wallet_id = :wallet_id "
                "ORDER BY created_at DESC LIMIT 50"
            )
            tx_rows = db.execute(tx_query, {"wallet_id": wallet_id}).fetchall()
            tx_list = []
            for tx in tx_rows:
                tx_list.append({
                    "transaction_type": tx[0],
                    "amount": float(tx[1]),
                    "description": tx[2],
                    "reference_id": tx[3],
                    "status": tx[4],
                    "created_at": tx[5]
                })
            
            wallet_info = {
                "balance": float(balance),
                "currency": currency,
                "transactions": tx_list
            }
    except Exception as e:
        logger.error(f"Error fetching Wallet data for CRM: {e}")
        
    # 4. Fetch Order history from orders & order_items via direct SQL
    orders = []
    try:
        order_query = text(
            "SELECT id, status, total_amount, created_at "
            "FROM orders "
            "WHERE user_id = :user_id "
            "ORDER BY created_at DESC"
        )
        order_rows = db.execute(order_query, {"user_id": str(id)}).fetchall()
        for ord_row in order_rows:
            ord_id, ord_status, ord_amount, ord_created = ord_row
            
            items_query = text(
                "SELECT item_type, item_id, item_name, quantity, unit_price "
                "FROM order_items "
                "WHERE order_id = :order_id"
            )
            item_rows = db.execute(items_query, {"order_id": ord_id}).fetchall()
            item_list = []
            for item in item_rows:
                item_list.append({
                    "item_type": item[0],
                    "item_id": item[1],
                    "item_name": item[2],
                    "quantity": item[3],
                    "unit_price": float(item[4])
                })
                
            orders.append({
                "id": ord_id,
                "status": ord_status,
                "total_amount": float(ord_amount),
                "created_at": ord_created,
                "items": item_list
            })
    except Exception as e:
        logger.error(f"Error fetching Order data for CRM: {e}")
        
    logger.info(f"CRM customer profile accessed for ID: {id}", extra={"event": "crm_profile_access", "customer_id": id})
    
    return {
        "basic_info": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "father_name": profile.father_name,
            "dob": profile.dob,
            "gender": profile.gender,
            "alternate_mobile": profile.alternate_mobile,
            "address": profile.address,
            "city": profile.city,
            "state": profile.state,
            "pin_code": profile.pin_code,
            "country": profile.country,
            "id_type": profile.id_type,
            "id_number": profile.id_number,
            "id_issue_date": profile.id_issue_date,
            "id_expiry_date": profile.id_expiry_date,
            "notes": profile.notes,
            "profile_status": profile.status
        },
        "sim_info": sims,
        "plan_info": plan_list,
        "wallet_info": wallet_info,
        "order_info": orders
    }


# ─── CRM Customer Search ─────────────────────────────────────────────────────

@router.get("/search")
def search_crm_customers(
    query: Optional[str] = Query(None),
    msisdn: Optional[str] = Query(None),
    iccid: Optional[str] = Query(None),
    imsi: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    name: Optional[str] = Query(None),
    admin: TokenData = Depends(get_current_crm_admin),
    db: Session = Depends(get_db)
):
    """Search customers by MSISDN, ICCID, IMSI, Order ID, Email, or Customer Name."""
    matching_user_ids = set()
    specific_search = False
    
    # 1. Search by MSISDN
    if msisdn:
        specific_search = True
        sa_row = db.execute(
            text("SELECT customer_id FROM sim_assignment WHERE msisdn ILIKE :msisdn"),
            {"msisdn": f"%{msisdn}%"}
        ).fetchall()
        matching_user_ids.update(r[0] for r in sa_row)
        
    # 2. Search by ICCID or IMSI
    if iccid or imsi:
        specific_search = True
        join_clause = "JOIN sim_inventory si ON sa.inventory_id = si.id"
        where_clauses = []
        params = {}
        if iccid:
            where_clauses.append("si.iccid ILIKE :iccid")
            params["iccid"] = f"%{iccid}%"
        if imsi:
            where_clauses.append("si.imsi ILIKE :imsi")
            params["imsi"] = f"%{imsi}%"
            
        sql = f"SELECT sa.customer_id FROM sim_assignment sa {join_clause} WHERE {' AND '.join(where_clauses)}"
        sa_rows = db.execute(text(sql), params).fetchall()
        matching_user_ids.update(r[0] for r in sa_rows)
        
    # 3. Search by Order ID
    if order_id:
        specific_search = True
        ord_rows = db.execute(
            text("SELECT DISTINCT user_id FROM orders WHERE id ILIKE :order_id"),
            {"order_id": f"%{order_id}%"}
        ).fetchall()
        for r in ord_rows:
            try:
                matching_user_ids.add(int(r[0]))
            except ValueError:
                pass
                
    # 4. Search by Email or Name directly in users
    if email or name:
        specific_search = True
        u_query = db.query(User.id)
        if email:
            u_query = u_query.filter(User.email.ilike(f"%{email}%"))
        if name:
            u_query = u_query.filter(User.name.ilike(f"%{name}%"))
        matching_user_ids.update(r[0] for r in u_query.all())
        
    # 5. General query parameter across all
    if query:
        # Search users table
        u_rows = db.query(User.id).filter(
            User.name.ilike(f"%{query}%") |
            User.email.ilike(f"%{query}%") |
            User.mobile.ilike(f"%{query}%")
        ).all()
        matching_user_ids.update(r[0] for r in u_rows)
        
        # Search MSISDN
        sa_row = db.execute(
            text("SELECT customer_id FROM sim_assignment WHERE msisdn ILIKE :query"),
            {"query": f"%{query}%"}
        ).fetchall()
        matching_user_ids.update(r[0] for r in sa_row)
        
        # Search ICCID / IMSI
        si_rows = db.execute(
            text(
                "SELECT sa.customer_id FROM sim_assignment sa "
                "JOIN sim_inventory si ON sa.inventory_id = si.id "
                "WHERE si.iccid ILIKE :query OR si.imsi ILIKE :query"
            ),
            {"query": f"%{query}%"}
        ).fetchall()
        matching_user_ids.update(r[0] for r in si_rows)
    
    # Fetch user records
    user_query = db.query(User).filter(User.role == "customer")
    if specific_search or query:
        if not matching_user_ids:
            return []
        user_query = user_query.filter(User.id.in_(list(matching_user_ids)))
        
    users = user_query.limit(100).all()
    
    results = []
    for u in users:
        profile = get_or_create_profile(db, u.id)
        results.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "mobile": u.mobile,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "father_name": profile.father_name,
            "dob": profile.dob,
            "gender": profile.gender,
            "alternate_mobile": profile.alternate_mobile,
            "address": profile.address,
            "city": profile.city,
            "state": profile.state,
            "pin_code": profile.pin_code,
            "country": profile.country,
            "id_type": profile.id_type,
            "id_number": profile.id_number,
            "id_issue_date": profile.id_issue_date,
            "id_expiry_date": profile.id_expiry_date,
            "notes": profile.notes,
            "profile_status": profile.status
        })
        
    return results


# ─── CRM Update Customer ──────────────────────────────────────────────────────

@router.put("/customer")
def update_crm_customer(
    cust_in: CustomerUpdate,
    admin: TokenData = Depends(get_current_crm_admin),
    db: Session = Depends(get_db)
):
    """Update user account and CRM profile attributes."""
    user = db.query(User).filter(User.id == cust_in.customer_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        
    profile = get_or_create_profile(db, cust_in.customer_id)
    
    if cust_in.name is not None:
        user.name = cust_in.name
    if cust_in.email is not None:
        user.email = cust_in.email
    if cust_in.mobile is not None:
        user.mobile = cust_in.mobile
    if cust_in.status is not None:
        profile.status = cust_in.status
        if cust_in.status == "SUSPENDED":
            user.is_active = False
        elif cust_in.status == "ACTIVE":
            user.is_active = True
            
    if cust_in.address is not None:
        profile.address = cust_in.address
    if cust_in.father_name is not None:
        profile.father_name = cust_in.father_name
    if cust_in.dob is not None:
        profile.dob = cust_in.dob
    if cust_in.gender is not None:
        profile.gender = cust_in.gender
    if cust_in.alternate_mobile is not None:
        profile.alternate_mobile = cust_in.alternate_mobile
    if cust_in.city is not None:
        profile.city = cust_in.city
    if cust_in.state is not None:
        profile.state = cust_in.state
    if cust_in.pin_code is not None:
        profile.pin_code = cust_in.pin_code
    if cust_in.country is not None:
        profile.country = cust_in.country
    if cust_in.id_type is not None:
        profile.id_type = cust_in.id_type
    if cust_in.id_number is not None:
        profile.id_number = cust_in.id_number
    if cust_in.id_issue_date is not None:
        profile.id_issue_date = cust_in.id_issue_date
    if cust_in.id_expiry_date is not None:
        profile.id_expiry_date = cust_in.id_expiry_date
    if cust_in.notes is not None:
        profile.notes = cust_in.notes
        
    db.commit()
    
    # Log activity
    activity = CustomerActivity(
        user_id=user.id,
        activity_type="CRM_UPDATE",
        description=f"CRM attributes updated by admin {admin.sub}."
    )
    db.add(activity)
    db.commit()
    
    logger.info(f"Customer {user.id} updated via CRM by admin {admin.sub}", extra={"event": "crm_customer_update", "customer_id": user.id})
    return {"message": "Customer profile updated successfully"}
