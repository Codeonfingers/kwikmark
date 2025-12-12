CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

-- Create baseline user
INSERT INTO users (email, password)
VALUES ('admin@kwikmark.app', crypt('Admin123!', gen_salt('bf')));

-- Assign admin role (user_roles)
INSERT INTO user_roles (user_id, role)
SELECT id, 'ADMIN'
FROM users
WHERE email = 'admin@kwikmark.app';


CREATE TYPE public.app_role AS ENUM (
    'consumer',
    'vendor',
    'shopper',
    'admin'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'accepted',
    'preparing',
    'ready',
    'picked_up',
    'inspecting',
    'approved',
    'completed',
    'disputed',
    'cancelled'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
);


--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.order_number := 'KM-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Default role is consumer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'consumer');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    icon text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: markets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.markets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location text NOT NULL,
    description text,
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    consumer_id uuid NOT NULL,
    vendor_id uuid,
    shopper_id uuid,
    market_id uuid,
    status public.order_status DEFAULT 'pending'::public.order_status NOT NULL,
    special_instructions text,
    subtotal numeric(10,2) DEFAULT 0,
    shopper_fee numeric(10,2) DEFAULT 0,
    total numeric(10,2) DEFAULT 0,
    pickup_photo_url text,
    inspection_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    payment_method text DEFAULT 'momo'::text,
    momo_phone text,
    momo_network text,
    transaction_id text,
    external_reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    unit text DEFAULT 'piece'::text,
    image_url text,
    is_available boolean DEFAULT true,
    stock_quantity integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    phone text,
    avatar_url text,
    ghana_card_number text,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    from_user_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: shopper_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shopper_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    shopper_id uuid,
    status text DEFAULT 'available'::text NOT NULL,
    accepted_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    delivered_at timestamp with time zone,
    commission_amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shoppers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shoppers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    market_id uuid,
    rating numeric(2,1) DEFAULT 0,
    total_deliveries integer DEFAULT 0,
    commission_rate numeric(4,2) DEFAULT 10.00,
    is_verified boolean DEFAULT false,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    market_id uuid,
    business_name text NOT NULL,
    description text,
    stall_number text,
    rating numeric(2,1) DEFAULT 0,
    total_orders integer DEFAULT 0,
    is_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: markets markets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.markets
    ADD CONSTRAINT markets_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: shopper_jobs shopper_jobs_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopper_jobs
    ADD CONSTRAINT shopper_jobs_order_id_key UNIQUE (order_id);


--
-- Name: shopper_jobs shopper_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopper_jobs
    ADD CONSTRAINT shopper_jobs_pkey PRIMARY KEY (id);


--
-- Name: shoppers shoppers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shoppers
    ADD CONSTRAINT shoppers_pkey PRIMARY KEY (id);


--
-- Name: shoppers shoppers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shoppers
    ADD CONSTRAINT shoppers_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_user_id_key UNIQUE (user_id);


--
-- Name: orders set_order_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();


--
-- Name: orders update_orders_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_timestamp BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: payments update_payments_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payments_timestamp BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: products update_products_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_timestamp BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles update_profiles_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: shoppers update_shoppers_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shoppers_timestamp BEFORE UPDATE ON public.shoppers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: vendors update_vendors_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendors_timestamp BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: orders orders_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE SET NULL;


--
-- Name: orders orders_shopper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_shopper_id_fkey FOREIGN KEY (shopper_id) REFERENCES public.shoppers(id) ON DELETE SET NULL;


--
-- Name: orders orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products products_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ratings ratings_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: shopper_jobs shopper_jobs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopper_jobs
    ADD CONSTRAINT shopper_jobs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: shopper_jobs shopper_jobs_shopper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopper_jobs
    ADD CONSTRAINT shopper_jobs_shopper_id_fkey FOREIGN KEY (shopper_id) REFERENCES public.shoppers(id) ON DELETE SET NULL;


--
-- Name: shoppers shoppers_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shoppers
    ADD CONSTRAINT shoppers_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE SET NULL;


--
-- Name: shoppers shoppers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shoppers
    ADD CONSTRAINT shoppers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE SET NULL;


--
-- Name: vendors vendors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON public.categories USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: markets Admins can manage markets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage markets" ON public.markets USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Categories are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);


--
-- Name: orders Consumers can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Consumers can create orders" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = consumer_id));


--
-- Name: ratings Create ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Create ratings" ON public.ratings FOR INSERT WITH CHECK ((auth.uid() = from_user_id));


--
-- Name: order_items Insert order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Insert order items" ON public.order_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.consumer_id = auth.uid())))));


--
-- Name: markets Markets are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Markets are viewable by everyone" ON public.markets FOR SELECT USING (true);


--
-- Name: orders Order participants can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Order participants can update" ON public.orders FOR UPDATE USING (((auth.uid() = consumer_id) OR (EXISTS ( SELECT 1
   FROM public.vendors
  WHERE ((vendors.id = orders.vendor_id) AND (vendors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.shoppers
  WHERE ((shoppers.id = orders.shopper_id) AND (shoppers.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: products Products are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);


--
-- Name: shoppers Shoppers are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shoppers are viewable by everyone" ON public.shoppers FOR SELECT USING (true);


--
-- Name: shopper_jobs Shoppers can accept jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shoppers can accept jobs" ON public.shopper_jobs FOR UPDATE USING (public.has_role(auth.uid(), 'shopper'::public.app_role));


--
-- Name: shoppers Shoppers can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shoppers can update own profile" ON public.shoppers FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: shopper_jobs Shoppers can view available jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shoppers can view available jobs" ON public.shopper_jobs FOR SELECT USING ((((status = 'available'::text) AND public.has_role(auth.uid(), 'shopper'::public.app_role)) OR (EXISTS ( SELECT 1
   FROM public.shoppers
  WHERE ((shoppers.id = shopper_jobs.shopper_id) AND (shoppers.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: payments System can update payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update payments" ON public.payments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can add vendor or shopper roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add vendor or shopper roles" ON public.user_roles FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (role = ANY (ARRAY['vendor'::public.app_role, 'shopper'::public.app_role]))));


--
-- Name: payments Users can create payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create payments" ON public.payments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: shoppers Users can create shopper profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create shopper profile" ON public.shoppers FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: vendors Users can create vendor profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create vendor profile" ON public.vendors FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (((auth.uid() = consumer_id) OR (EXISTS ( SELECT 1
   FROM public.vendors
  WHERE ((vendors.id = orders.vendor_id) AND (vendors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.shoppers
  WHERE ((shoppers.id = orders.shopper_id) AND (shoppers.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: payments Users can view own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: vendors Vendors are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vendors are viewable by everyone" ON public.vendors FOR SELECT USING (true);


--
-- Name: products Vendors can delete own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vendors can delete own products" ON public.products FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.vendors
  WHERE ((vendors.id = products.vendor_id) AND (vendors.user_id = auth.uid())))));


--
-- Name: products Vendors can manage own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vendors can manage own products" ON public.products FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.vendors
  WHERE ((vendors.id = products.vendor_id) AND (vendors.user_id = auth.uid())))));


--
-- Name: products Vendors can update own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vendors can update own products" ON public.products FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.vendors
  WHERE ((vendors.id = products.vendor_id) AND (vendors.user_id = auth.uid())))));


--
-- Name: vendors Vendors can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vendors can update own profile" ON public.vendors FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: order_items View order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View order items" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND ((orders.consumer_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.vendors
          WHERE ((vendors.id = orders.vendor_id) AND (vendors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.shoppers
          WHERE ((shoppers.id = orders.shopper_id) AND (shoppers.user_id = auth.uid())))))))));


--
-- Name: ratings View ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View ratings" ON public.ratings FOR SELECT USING (true);


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: markets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: shopper_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shopper_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: shoppers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shoppers ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


