-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MODERATOR', 'GUEST');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('TEXT', 'AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NOT_STARTED', 'FAILED', 'EDIT', 'CREATE');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "DriverType" AS ENUM ('FULL_TIME', 'PART_TIME', 'TEMP', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('PICKUP', 'DELIVERY', 'PICKUP_AND_DELIVERY', 'SERVICE', 'ADMIN', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductScrapeMethod" AS ENUM ('MANUAL', 'WORDPRESS', 'SHOPIFY', 'SQUARESPACE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'ARTISAN', 'DRIVER', 'GUEST');

-- CreateEnum
CREATE TYPE "RefinementType" AS ENUM ('ITEM', 'STYLE');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('UPCYCLE_RESULT', 'GENERIC');

-- CreateEnum
CREATE TYPE "UpcycleType" AS ENUM ('GENERATE', 'GENERATE_FROM_STRUCTURE', 'TRAIN_AND_GENERATE', 'GENERATE_ON_PRE_TRAINED');

-- CreateEnum
CREATE TYPE "UpcycleThumb" AS ENUM ('UP', 'DOWN', 'NEUTRAL');

-- CreateTable
CREATE TABLE "GeneratedImages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "GeneratedImages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationSurvey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "levelOfStatisfaction" TEXT NOT NULL,
    "directDigitalFabrication" TEXT NOT NULL,

    CONSTRAINT "GenerationSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "guidancePrompt" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "exceutionTime" TEXT NOT NULL,

    CONSTRAINT "Variation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "guidanceScale" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT NOT NULL,
    "exceutionTime" TEXT NOT NULL,

    CONSTRAINT "Modification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subreddit" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT,

    CONSTRAINT "Subreddit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "userId" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("userId","subredditId")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumComment" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "replyToId" TEXT,
    "commentId" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ForumComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" "VoteType" NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "CommentVote" (
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "type" "VoteType" NOT NULL,

    CONSTRAINT "CommentVote_pkey" PRIMARY KEY ("userId","commentId")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'GUEST',
    "profileId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "memberId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "memberOneId" TEXT NOT NULL,
    "memberTwoId" TEXT NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "driverId" TEXT,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL DEFAULT 'TEXT',
    "profileId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "memberId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Road" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Road_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadPoint" (
    "id" TEXT NOT NULL,
    "roadId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depot" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT,
    "magicCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Depot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "formatted" TEXT NOT NULL,
    "street" TEXT,
    "additional" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "depotId" TEXT,
    "driverId" TEXT,
    "startVehicleId" TEXT,
    "endVehicleId" TEXT,
    "clientId" TEXT,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "day" "WeekDay" NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "type" "DriverType" NOT NULL DEFAULT 'FULL_TIME',
    "depotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "defaultVehicleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "driverId" TEXT,
    "shiftStart" INTEGER NOT NULL,
    "shiftEnd" INTEGER NOT NULL,
    "capacity" INTEGER,
    "maxTasks" INTEGER,
    "maxTravelTime" INTEGER,
    "maxDistance" INTEGER,
    "notes" TEXT,
    "cargo" TEXT,
    "routeId" TEXT,
    "optimizedRouteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Break" (
    "id" SERIAL NOT NULL,
    "start" INTEGER,
    "end" INTEGER,
    "duration" INTEGER NOT NULL,
    "vehicleId" TEXT NOT NULL,

    CONSTRAINT "Break_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "defaultJobId" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "depotId" TEXT NOT NULL,
    "clientId" TEXT,
    "prepTime" INTEGER NOT NULL,
    "serviceTime" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "timeWindowStart" INTEGER NOT NULL,
    "timeWindowEnd" INTEGER NOT NULL,
    "routeId" TEXT,
    "isOptimized" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "order" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "optimizedStopId" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'EDIT',
    "optimizedData" TEXT,
    "deliveryAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizedRoutePath" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "distance" DOUBLE PRECISION,
    "startTime" INTEGER,
    "endTime" INTEGER,
    "status" "RouteStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "geoJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizedRoutePath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizedStop" (
    "id" TEXT NOT NULL,
    "routePathId" TEXT NOT NULL,
    "jobId" TEXT,
    "arrival" INTEGER NOT NULL,
    "departure" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "prep" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "order" TEXT,
    "status" "RouteStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizedStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "bio" TEXT,
    "description" TEXT,
    "ownerPhoto" TEXT,
    "logoPhoto" TEXT,
    "coverPhoto" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "attributeTags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopAddress" (
    "id" TEXT NOT NULL,
    "address" TEXT,
    "additional" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "shopId" TEXT,

    CONSTRAINT "ShopAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "shopProductId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceInCents" INTEGER,
    "currency" TEXT,
    "imageUrl" TEXT,
    "productUrl" TEXT,
    "tags" TEXT[],
    "attributeTags" TEXT[],
    "materialTags" TEXT[],
    "environmentalTags" TEXT[],
    "aiGeneratedTags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scrapeMethod" "ProductScrapeMethod" NOT NULL DEFAULT 'MANUAL',
    "shopId" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Example" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Example_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "title" TEXT,
    "role" "Role" NOT NULL DEFAULT 'GUEST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "processes" TEXT,
    "materials" TEXT,
    "principles" TEXT,
    "description" TEXT,
    "unmoderatedForm" BOOLEAN NOT NULL DEFAULT false,
    "moderatedForm" BOOLEAN NOT NULL DEFAULT false,
    "hiddenForm" BOOLEAN NOT NULL DEFAULT false,
    "privateForm" BOOLEAN NOT NULL DEFAULT false,
    "supplyChain" BOOLEAN NOT NULL DEFAULT false,
    "messagingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessType" TEXT,
    "experience" TEXT,
    "practice" TEXT,
    "country" TEXT,
    "state" TEXT,
    "email" TEXT,
    "ownerId" TEXT,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestSurvey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "country" TEXT,
    "state" TEXT,
    "artisanalPractice" TEXT,
    "otherPractice" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "GuestSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendingMachine" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "inventory" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendingMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpcycleResult" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectTitle" TEXT,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "refinementObject" TEXT NOT NULL,
    "refinementType" "RefinementType" NOT NULL,
    "upcycleType" "UpcycleType" NOT NULL DEFAULT 'GENERATE',
    "styleImageUrl" TEXT,
    "structureImageUrl" TEXT,
    "zipFileUrl" TEXT,
    "outputImageUrl" TEXT,
    "improvePrompt" BOOLEAN,
    "removeBackgroundScrap" BOOLEAN,
    "removeBackgroundStructure" BOOLEAN,
    "removeBackgroundGenerated" BOOLEAN,
    "generationModelName" TEXT,
    "styleModelName" TEXT,
    "trainingModelName" TEXT,
    "trackingId" TEXT,
    "userId" TEXT NOT NULL,
    "styleSettings" JSONB,
    "structureSettings" JSONB,
    "trainingSettings" JSONB,

    CONSTRAINT "UpcycleResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpcycleQuestion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "question" TEXT NOT NULL,
    "llmResponse" TEXT NOT NULL,
    "upcycleResultId" TEXT NOT NULL,

    CONSTRAINT "UpcycleQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL DEFAULT 'GENERIC',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpcycleRating" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rating" "UpcycleThumb" NOT NULL DEFAULT 'NEUTRAL',
    "reasoning" TEXT,
    "upcycleResultId" TEXT NOT NULL,

    CONSTRAINT "UpcycleRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DepotToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "GeneratedImages_userId_idx" ON "GeneratedImages"("userId");

-- CreateIndex
CREATE INDEX "GenerationSurvey_userId_idx" ON "GenerationSurvey"("userId");

-- CreateIndex
CREATE INDEX "Variation_userId_idx" ON "Variation"("userId");

-- CreateIndex
CREATE INDEX "Modification_userId_idx" ON "Modification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subreddit_name_key" ON "Subreddit"("name");

-- CreateIndex
CREATE INDEX "Subreddit_name_idx" ON "Subreddit"("name");

-- CreateIndex
CREATE INDEX "Member_profileId_idx" ON "Member"("profileId");

-- CreateIndex
CREATE INDEX "Member_serverId_idx" ON "Member"("serverId");

-- CreateIndex
CREATE INDEX "Message_channelId_idx" ON "Message"("channelId");

-- CreateIndex
CREATE INDEX "Message_memberId_idx" ON "Message"("memberId");

-- CreateIndex
CREATE INDEX "Conversation_memberTwoId_idx" ON "Conversation"("memberTwoId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_memberOneId_memberTwoId_key" ON "Conversation"("memberOneId", "memberTwoId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_driverId_key" ON "Profile"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Server_inviteCode_key" ON "Server"("inviteCode");

-- CreateIndex
CREATE INDEX "Server_profileId_idx" ON "Server"("profileId");

-- CreateIndex
CREATE INDEX "Channel_profileId_idx" ON "Channel"("profileId");

-- CreateIndex
CREATE INDEX "Channel_serverId_idx" ON "Channel"("serverId");

-- CreateIndex
CREATE INDEX "DirectMessage_memberId_idx" ON "DirectMessage"("memberId");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_idx" ON "DirectMessage"("conversationId");

-- CreateIndex
CREATE INDEX "RoadPoint_roadId_idx" ON "RoadPoint"("roadId");

-- CreateIndex
CREATE UNIQUE INDEX "Depot_ownerId_key" ON "Depot"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_depotId_key" ON "Address"("depotId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_driverId_key" ON "Address"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_startVehicleId_key" ON "Address"("startVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_endVehicleId_key" ON "Address"("endVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_clientId_key" ON "Address"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_jobId_key" ON "Address"("jobId");

-- CreateIndex
CREATE INDEX "Schedule_driverId_idx" ON "Schedule"("driverId");

-- CreateIndex
CREATE INDEX "Driver_depotId_idx" ON "Driver"("depotId");

-- CreateIndex
CREATE INDEX "Vehicle_driverId_idx" ON "Vehicle"("driverId");

-- CreateIndex
CREATE INDEX "Vehicle_routeId_idx" ON "Vehicle"("routeId");

-- CreateIndex
CREATE INDEX "Vehicle_optimizedRouteId_idx" ON "Vehicle"("optimizedRouteId");

-- CreateIndex
CREATE INDEX "Vehicle_depotId_idx" ON "Vehicle"("depotId");

-- CreateIndex
CREATE INDEX "Break_vehicleId_idx" ON "Break"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_depotId_idx" ON "Client"("depotId");

-- CreateIndex
CREATE INDEX "Job_clientId_idx" ON "Job"("clientId");

-- CreateIndex
CREATE INDEX "Job_routeId_idx" ON "Job"("routeId");

-- CreateIndex
CREATE INDEX "Job_depotId_idx" ON "Job"("depotId");

-- CreateIndex
CREATE INDEX "Route_depotId_idx" ON "Route"("depotId");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizedRoutePath_vehicleId_key" ON "OptimizedRoutePath"("vehicleId");

-- CreateIndex
CREATE INDEX "OptimizedRoutePath_routeId_idx" ON "OptimizedRoutePath"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizedStop_jobId_key" ON "OptimizedStop"("jobId");

-- CreateIndex
CREATE INDEX "OptimizedStop_routePathId_idx" ON "OptimizedStop"("routePathId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopAddress_shopId_key" ON "ShopAddress"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_shopId_shopProductId_key" ON "Product"("shopId", "shopProductId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Survey_ownerId_idx" ON "Survey"("ownerId");

-- CreateIndex
CREATE INDEX "GuestSurvey_userId_idx" ON "GuestSurvey"("userId");

-- CreateIndex
CREATE INDEX "VendingMachine_latitude_longitude_idx" ON "VendingMachine"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "UpcycleResult_trackingId_key" ON "UpcycleResult"("trackingId");

-- CreateIndex
CREATE UNIQUE INDEX "UpcycleRating_upcycleResultId_key" ON "UpcycleRating"("upcycleResultId");

-- CreateIndex
CREATE UNIQUE INDEX "_DepotToUser_AB_unique" ON "_DepotToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_DepotToUser_B_index" ON "_DepotToUser"("B");

-- AddForeignKey
ALTER TABLE "GeneratedImages" ADD CONSTRAINT "GeneratedImages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationSurvey" ADD CONSTRAINT "GenerationSurvey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variation" ADD CONSTRAINT "Variation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modification" ADD CONSTRAINT "Modification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subreddit" ADD CONSTRAINT "Subreddit_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "Subreddit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "Subreddit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ForumComment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ForumComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_memberOneId_fkey" FOREIGN KEY ("memberOneId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_memberTwoId_fkey" FOREIGN KEY ("memberTwoId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Server" ADD CONSTRAINT "Server_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Road" ADD CONSTRAINT "Road_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadPoint" ADD CONSTRAINT "RoadPoint_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_startVehicleId_fkey" FOREIGN KEY ("startVehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_endVehicleId_fkey" FOREIGN KEY ("endVehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Break" ADD CONSTRAINT "Break_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizedRoutePath" ADD CONSTRAINT "OptimizedRoutePath_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizedRoutePath" ADD CONSTRAINT "OptimizedRoutePath_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizedStop" ADD CONSTRAINT "OptimizedStop_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizedStop" ADD CONSTRAINT "OptimizedStop_routePathId_fkey" FOREIGN KEY ("routePathId") REFERENCES "OptimizedRoutePath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopAddress" ADD CONSTRAINT "ShopAddress_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestSurvey" ADD CONSTRAINT "GuestSurvey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpcycleResult" ADD CONSTRAINT "UpcycleResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpcycleQuestion" ADD CONSTRAINT "UpcycleQuestion_upcycleResultId_fkey" FOREIGN KEY ("upcycleResultId") REFERENCES "UpcycleResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpcycleRating" ADD CONSTRAINT "UpcycleRating_upcycleResultId_fkey" FOREIGN KEY ("upcycleResultId") REFERENCES "UpcycleResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepotToUser" ADD CONSTRAINT "_DepotToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Depot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepotToUser" ADD CONSTRAINT "_DepotToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
