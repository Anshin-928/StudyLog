SET local check_function_bodies = off;

CREATE TABLE "public"."categories" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "color_code" text                     DEFAULT '#1A73E8'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "sort_order" smallint                 NOT NULL DEFAULT '0'::smallint,
  "user_id"    uuid                     NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."exam_events" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "name"       text                     NOT NULL,
  "event_date" date                     NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "exam_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."exam_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."follows" (
  "follower_id"  uuid                     NOT NULL,
  "following_id" uuid                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "status"       text                     NOT NULL DEFAULT 'accepted'::text,
  CONSTRAINT "follows_pkey" PRIMARY KEY (follower_id, following_id),
  CONSTRAINT "follows_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text])))
);

ALTER TABLE "public"."follows"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."inquiries" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "category"   text                     NOT NULL,
  "message"    text                     NOT NULL,
  "status"     text                     NOT NULL DEFAULT 'open'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "inquiries_category_check" CHECK ((category = ANY (ARRAY['bug'::text, 'feature'::text, 'privacy'::text, 'other'::text]))),
  CONSTRAINT "inquiries_message_check" CHECK (((char_length(message) >= 1) AND (char_length(message) <= 2000))),
  CONSTRAINT "inquiries_pkey" PRIMARY KEY (id),
  CONSTRAINT "inquiries_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])))
);

ALTER TABLE "public"."inquiries"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."likes" (
  "user_id"      uuid                     NOT NULL,
  "study_log_id" uuid                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "likes_pkey" PRIMARY KEY (user_id, study_log_id)
);

ALTER TABLE "public"."likes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."materials" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "category_id" uuid,
  "title"       text                     NOT NULL,
  "image_url"   text                     NOT NULL,
  "status"      text                     DEFAULT 'active'::text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "sort_order"  smallint                 NOT NULL DEFAULT '0'::smallint,
  "unit"        text                     NOT NULL DEFAULT 'ページ'::text,
  "user_id"     uuid                     NOT NULL,
  CONSTRAINT "materials_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."materials"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"            uuid                     NOT NULL,
  "display_name"  text,
  "avatar_url"    text,
  "bio"           text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "is_public"     boolean                  NOT NULL DEFAULT true,
  "goal_group"    text,
  "goal_category" text,
  CONSTRAINT "profiles_goal_category_check" CHECK ((goal_category = ANY (ARRAY['university'::text, 'qualification'::text, 'language'::text, 'other'::text]))),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."study_logs" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "material_id"      uuid,
  "study_datetime"   timestamp with time zone NOT NULL,
  "duration_minutes" integer,
  "pages"            integer,
  "memo"             text,
  "image_url"        text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "user_id"          uuid                     NOT NULL,
  "is_public"        boolean                  NOT NULL DEFAULT true,
  CONSTRAINT "study_logs_duration_minutes_check" CHECK (((duration_minutes IS NULL) OR (duration_minutes >= 0))),
  CONSTRAINT "study_logs_pages_check" CHECK (((pages IS NULL) OR (pages >= 0))),
  CONSTRAINT "study_logs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."study_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_goals" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"       uuid                     NOT NULL,
  "goal_group"    text                     NOT NULL,
  "goal_category" text,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "user_goals_goal_category_check" CHECK ((goal_category = ANY (ARRAY['university'::text, 'qualification'::text, 'language'::text, 'other'::text]))),
  CONSTRAINT "user_goals_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."user_goals"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_user_provider (
  p_email text
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_provider text;
BEGIN
  -- auth.identities テーブルから provider を探す
  SELECT provider INTO v_provider
  FROM auth.identities
  WHERE email = p_email
  LIMIT 1;

  -- 見つかれば 'google' や 'email' を返す。未登録なら 'not_found'
  IF v_provider IS NOT NULL THEN
    RETURN v_provider;
  ELSE
    RETURN 'not_found';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_user()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$BEGIN
  -- 初期表示名は「名称未設定」をセット
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, '名称未設定');
  RETURN new;
END;$function$;

ALTER TABLE "public"."materials"
  ADD CONSTRAINT "materials_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."categories"
  ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."exam_events"
  ADD CONSTRAINT "exam_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."follows"
  ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."follows"
  ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."inquiries"
  ADD CONSTRAINT "inquiries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."likes"
  ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."materials"
  ADD CONSTRAINT "materials_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."study_logs"
  ADD CONSTRAINT "study_logs_material_id_fkey" FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE SET NULL;

ALTER TABLE "public"."likes"
  ADD CONSTRAINT "likes_study_log_id_fkey" FOREIGN KEY (study_log_id) REFERENCES public.study_logs(id) ON DELETE CASCADE;

ALTER TABLE "public"."study_logs"
  ADD CONSTRAINT "study_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_goals"
  ADD CONSTRAINT "user_goals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_follows_follower ON public.follows USING btree (follower_id);

CREATE INDEX idx_follows_following ON public.follows USING btree (following_id);

CREATE INDEX idx_profiles_goal_category ON public.profiles USING btree (goal_category);

CREATE INDEX idx_profiles_goal_group ON public.profiles USING btree (goal_group);

CREATE INDEX idx_study_logs_material_id ON public.study_logs USING btree (material_id);

CREATE INDEX idx_study_logs_study_datetime ON public.study_logs USING btree (study_datetime);

CREATE INDEX inquiries_user_id_created_at_idx ON public.inquiries USING btree (user_id, created_at DESC);

CREATE INDEX likes_study_log_id_idx ON public.likes USING btree (study_log_id);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Categories are viewable by everyone" ON "public"."categories"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Users can manage own categories" ON "public"."categories"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can delete own exam events" ON "public"."exam_events"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own exam events" ON "public"."exam_events"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own exam events" ON "public"."exam_events"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Follows are viewable by everyone" ON "public"."follows"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Users can delete received follows" ON "public"."follows"
  FOR DELETE
  TO PUBLIC
  USING (((auth.uid() = follower_id) OR (auth.uid() = following_id)));

CREATE POLICY "Users can manage their own follows" ON "public"."follows"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = follower_id));

CREATE POLICY "Users can update received follow requests" ON "public"."follows"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = following_id));

CREATE POLICY "follows_delete" ON "public"."follows"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = follower_id));

CREATE POLICY "follows_insert" ON "public"."follows"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = follower_id));

CREATE POLICY "follows_select" ON "public"."follows"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Users can insert own inquiries" ON "public"."inquiries"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own inquiries" ON "public"."inquiries"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Authenticated users can view likes" ON "public"."likes"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Users can delete own likes" ON "public"."likes"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own likes" ON "public"."likes"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Materials are viewable by everyone" ON "public"."materials"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Users can manage own materials" ON "public"."materials"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Users can update own profile" ON "public"."profiles"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = id));

CREATE POLICY "Private study_logs visibility" ON "public"."study_logs"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() = user_id) OR ((is_public = true) AND ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = study_logs.user_id) AND (profiles.is_public = true)))) OR (EXISTS ( SELECT 1
   FROM public.follows
  WHERE ((follows.follower_id = auth.uid()) AND (follows.following_id = study_logs.user_id) AND (follows.status = 'accepted'::text))))))));

CREATE POLICY "Users can manage own logs" ON "public"."study_logs"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Anyone can view user_goals" ON "public"."user_goals"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Users can delete own goals" ON "public"."user_goals"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own goals" ON "public"."user_goals"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Avatar images are publicly accessible." ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Public insert study-logs" ON "storage"."objects"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((bucket_id = 'study-logs'::text));

CREATE POLICY "Public read study-logs" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'study-logs'::text));

CREATE POLICY "Users can delete their own avatars." ON "storage"."objects"
  FOR DELETE
  TO PUBLIC
  USING (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = owner_id)));

CREATE POLICY "Users can update their own avatars." ON "storage"."objects"
  FOR UPDATE
  TO PUBLIC
  USING (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = owner_id)));

CREATE POLICY "Users can upload their own avatars." ON "storage"."objects"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = owner_id)));

CREATE POLICY "画像アップロード許可" ON "storage"."objects"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((bucket_id = 'material-images'::text));

CREATE POLICY "画像表示許可" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'material-images'::text));

GRANT EXECUTE ON FUNCTION "public"."check_user_provider"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."delete_user"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."exam_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."follows" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inquiries" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."likes" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."materials" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."study_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_goals" TO "anon", "authenticated", "postgres", "service_role";

